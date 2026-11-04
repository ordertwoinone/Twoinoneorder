export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { checkOrderPin } from "@/lib/kitchen-waiters";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { POST as addItems } from "../../../served/[id]/items/route";

/* Served Orders' add items, but only with the PIN of the order's own waiter. */
export async function POST(request: Request, context: { params: { id: string } }) {
  const body = await request.clone().json().catch(() => ({}));
  const { data: order, error } = await supabaseAdminLive
    .from("kitchen_orders")
    .select("waiter_id, waiter_name")
    .eq("id", context.params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: "That order wasn't found. Refresh the page." }, { status: 404 });

  const denied = await checkOrderPin(request, order, body?.pin);
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
  return addItems(request, context);
}
