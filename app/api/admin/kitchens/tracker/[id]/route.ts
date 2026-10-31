export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { updateRow } from "@/lib/admin-write";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/** The one change the tracker can make: an order has reached its table. */
export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  const { data: order, error: readError } = await supabaseAdminLive
    .from("kitchen_orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  // Preparing as well as ready, so a forgotten Mark ready can't leave a waiter stuck.
  if (!order || (order.status !== "ready" && order.status !== "preparing")) {
    return NextResponse.json({ error: "That order can't be marked served now." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { error } = await updateRow("kitchen_orders", params.id, {
    status: "served",
    served_at: now,
    events: [...(order.events ?? []), { type: "served", at: now }],
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
