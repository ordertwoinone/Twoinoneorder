export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { roundMoney } from "@/lib/kalba/pricing";
import { checkOrderPin } from "@/lib/kitchen-waiters";
import type { OrderItem } from "@/lib/kitchen-orders";
import { supabaseAdminLive } from "@/lib/supabase-admin";

const MAX_QTY = 99;

/**
 * Changes how many of each item an order has, 0 taking it off. Only the items
 * still to be cooked can change, and only while the kitchen has the order, so
 * nothing already eaten or plated is touched. A change that would leave less to
 * pay than has already been taken is refused: that is a refund, done on Payments.
 * Only the PIN of the waiter who took the order can change it.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const changes: { index: number; qty: number }[] = Array.isArray(body?.items) ? body.items : [];
  if (
    changes.length === 0 ||
    changes.some((c) => !Number.isInteger(c?.index) || !Number.isInteger(c?.qty) || c.qty < 0 || c.qty > MAX_QTY)
  ) {
    return NextResponse.json({ error: "Those changes aren't valid." }, { status: 400 });
  }

  const { data: order, error: readError } = await supabaseAdminLive
    .from("kitchen_orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!order || (order.status !== "new" && order.status !== "preparing")) {
    return NextResponse.json({ error: "This order has left the kitchen, so it can't be changed. Refresh the page." }, { status: 409 });
  }
  const denied = await checkOrderPin(request, order, body?.pin);
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
  if (order.paid_at) {
    return NextResponse.json({ error: "This order is already paid. Add items instead, or sort it out on Payments." }, { status: 409 });
  }

  const items = (order.items ?? []) as OrderItem[];
  const round = Number(order.round ?? 1);
  const qtyAt = new Map(changes.map((c) => [c.index, c.qty]));
  for (const index of Array.from(qtyAt.keys())) {
    if (!items[index] || (items[index].round ?? 1) !== round) {
      return NextResponse.json({ error: "Only items still being cooked can change. Refresh the page." }, { status: 409 });
    }
  }

  let removedQty = 0;
  const next = items.flatMap((item, i) => {
    const qty = qtyAt.get(i);
    if (qty === undefined || qty === item.qty) return [item];
    removedQty += Math.max(0, item.qty - qty);
    return qty === 0 ? [] : [{ ...item, qty, line_total: roundMoney(Number(item.unit_price) * qty) }];
  });
  if (next.length === 0) {
    return NextResponse.json({ error: "That would leave nothing on the order. Ask the kitchen to cancel it instead." }, { status: 400 });
  }

  const total = roundMoney(next.reduce((sum, item) => sum + Number(item.line_total), 0));
  const owed = roundMoney(total - Number(order.discount ?? 0));
  if (owed < Number(order.paid_amount ?? 0)) {
    return NextResponse.json(
      { error: `AED ${Number(order.paid_amount).toFixed(2)} is already paid, more than the order would cost. Sort it out on Payments.` },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const { data: saved, error } = await supabaseAdminLive
    .from("kitchen_orders")
    .update({
      items: next,
      total,
      events: [...(order.events ?? []), { type: "items_changed", at: now, count: removedQty, amount: roundMoney(Number(order.total) - total) }],
      updated_at: now,
    })
    .eq("id", params.id)
    .eq("status", order.status)
    .eq("updated_at", order.updated_at)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!saved?.length) {
    return NextResponse.json({ error: "This order changed while you were editing. Refresh and try again." }, { status: 409 });
  }
  return NextResponse.json({ total });
}
