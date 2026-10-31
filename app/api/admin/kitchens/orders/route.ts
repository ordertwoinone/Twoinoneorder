export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("kitchen_orders")
    .select("id, order_number, table_code, guests, waiter_name, items, total, status, payment_method, paid_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
