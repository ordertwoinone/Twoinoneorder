export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";

const COLUMNS = "id, order_number, table_code, guests, waiter_name, items, total, paid_at, created_at";

/** Read separately, so a long paid history can never crowd out money still owed. */
export async function GET() {
  const [unpaid, paid] = await Promise.all([
    supabaseAdminLive
      .from("kitchen_orders")
      .select(COLUMNS)
      .eq("status", "served")
      .is("paid_at", null)
      .order("created_at", { ascending: true })
      .limit(500),
    supabaseAdminLive
      .from("kitchen_orders")
      .select(COLUMNS)
      .eq("status", "served")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(200),
  ]);

  const error = unpaid.error ?? paid.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ unpaid: unpaid.data, paid: paid.data });
}
