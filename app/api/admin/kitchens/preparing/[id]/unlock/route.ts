export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { checkOrderPin } from "@/lib/kitchen-waiters";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/** Checks a waiter's PIN against an order before they start changing it. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const { data: order, error } = await supabaseAdminLive
    .from("kitchen_orders")
    .select("id, waiter_id, waiter_name, status")
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!order || order.status === "served" || order.status === "cancelled") {
    return NextResponse.json({ error: "This order can't be changed any more. Refresh the page." }, { status: 409 });
  }

  const denied = await checkOrderPin(request, order, body?.pin);
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
  return NextResponse.json({ ok: true });
}
