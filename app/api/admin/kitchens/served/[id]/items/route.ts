export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getLiveKitchenAddonGroups } from "@/lib/kalba/addons-server";
import { roundMoney } from "@/lib/kalba/pricing";
import { priceOrder, type OrderDish } from "@/lib/kitchen-orders";
import { supabaseAdminLive } from "@/lib/supabase-admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Adds items to a served order and sends it back to the kitchen as the same
 * order. Prices come from the database, as they do for a new order. Only a
 * served order qualifies, which also stops a double tap adding everything twice.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const lines = Array.isArray(body?.items) ? body.items : [];
  const dishIds = lines.map((l: { dishId?: unknown }) => String(l?.dishId ?? ""));
  if (lines.length === 0 || dishIds.some((id: string) => !UUID.test(id))) {
    return NextResponse.json({ error: "Choose at least one dish." }, { status: 400 });
  }

  const { data: order, error: readError } = await supabaseAdminLive
    .from("kitchen_orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!order || order.status !== "served") {
    return NextResponse.json({ error: "This order isn't served any more. Refresh the page." }, { status: 409 });
  }

  const { data: dishes, error: dishError } = await supabaseAdminLive
    .from("kitchen_dishes")
    .select("id, name, price, kitchen")
    .eq("is_active", true)
    .in("id", dishIds);
  if (dishError) return NextResponse.json({ error: dishError.message }, { status: 500 });

  const priced = priceOrder(lines, (dishes ?? []) as OrderDish[], await getLiveKitchenAddonGroups());
  if ("error" in priced) {
    const message = priced.error === "unavailable" ? "A dish or add-on has changed. Please choose again." : priced.error;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const now = new Date().toISOString();
  const round = Number(order.round ?? 1) + 1;
  const added = priced.items.map((item) => ({ ...item, round, added_at: now }));

  /* A fully paid order now owes only the new items. An order on credit stays on
     credit, and the customer simply owes more. */
  const wasPaid = Boolean(order.paid_at);

  const { error } = await supabaseAdminLive
    .from("kitchen_orders")
    .update({
      items: [...(order.items ?? []), ...added],
      total: roundMoney(Number(order.total) + priced.total),
      status: "new",
      round,
      round_started_at: now,
      ready_at: null,
      served_at: null,
      ...(wasPaid ? { paid_amount: Number(order.total), paid_at: null, payment_method: null } : {}),
      events: [
        ...(order.events ?? []),
        { type: "items_added", at: now, count: added.reduce((n, i) => n + i.qty, 0), amount: priced.total },
      ],
      updated_at: now,
    })
    .eq("id", params.id)
    .eq("status", "served");

  if (error) {
    const missing = /round|paid_amount|events/.test(error.message ?? "");
    return NextResponse.json(
      { error: missing ? "Run supabase/kitchen_order_rounds.sql in the Supabase SQL editor first." : error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ round });
}
