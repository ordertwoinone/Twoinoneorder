export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";

const COLUMNS =
  "id, order_number, table_code, guests, waiter_name, items, total, payment_method, paid_at, credit_name, credit_phone, credit_at, created_at";

/** Read separately, so a long settled history can never crowd out money still owed. */
export async function GET() {
  const [outstanding, settled] = await Promise.all([
    supabaseAdminLive
      .from("kitchen_orders")
      .select(COLUMNS)
      .eq("status", "served")
      .eq("payment_method", "credit")
      .is("paid_at", null)
      .order("credit_at", { ascending: true })
      .limit(500),
    supabaseAdminLive
      .from("kitchen_orders")
      .select(COLUMNS)
      .eq("status", "served")
      .not("credit_at", "is", null)
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(200),
  ]);

  const error = outstanding.error ?? settled.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ outstanding: outstanding.data, settled: settled.data });
}
