export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { OrderItem } from "@/lib/kitchen-orders";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/**
 * Marks one item of the round being cooked ready, or not ready again. The
 * first item started moves a new order to preparing, and the last one ready
 * makes the whole order ready, just as Mark ready does.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const index = body?.index;
  const ready = body?.ready === true;
  if (!Number.isInteger(index) || typeof body?.ready !== "boolean") {
    return NextResponse.json({ error: "That change isn't valid." }, { status: 400 });
  }

  const { data: order, error: readError } = await supabaseAdminLive
    .from("kitchen_orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!order || !["new", "preparing", "ready"].includes(order.status)) {
    return NextResponse.json({ error: "This order has left the kitchen. Refresh the page." }, { status: 409 });
  }

  const items = (order.items ?? []) as OrderItem[];
  const round = Number(order.round ?? 1);
  const item = items[index];
  if (!item || (item.round ?? 1) !== round) {
    return NextResponse.json({ error: "That item isn't being cooked now. Refresh the page." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const next = items.map((it, i) => {
    if (i !== index) return it;
    const copy = { ...it };
    if (ready) copy.ready_at = now;
    else delete copy.ready_at;
    return copy;
  });
  // Mark ready on the whole order counts for items not ticked one by one.
  const allReady = next.filter((it) => (it.round ?? 1) === round).every((it) => it.ready_at);

  const events = [...(order.events ?? []), { type: ready ? "item_ready" : "item_not_ready", at: now, name: item.name }];
  let status = order.status;
  const extra: Record<string, unknown> = {};
  if (ready && allReady) {
    status = "ready";
    extra.ready_at = now;
    events.push({ type: "ready", at: now });
  } else if (order.status === "new" || (!ready && order.status === "ready")) {
    status = "preparing";
    if (order.status === "ready") extra.ready_at = null;
    events.push({ type: "preparing", at: now });
  }

  const { data: saved, error } = await supabaseAdminLive
    .from("kitchen_orders")
    .update({ items: next, status, events, updated_at: now, ...extra })
    .eq("id", params.id)
    .eq("updated_at", order.updated_at)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!saved?.length) {
    return NextResponse.json({ error: "This order changed at the same time. Try again." }, { status: 409 });
  }
  return NextResponse.json({ status });
}
