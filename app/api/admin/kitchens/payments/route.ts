export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withoutPrivate } from "@/lib/kitchen-orders";
import { supabaseAdminLive } from "@/lib/supabase-admin";


/** Read separately, so a long paid history can never crowd out money still owed. */
export async function GET() {
  const [unpaid, paid] = await Promise.all([
    supabaseAdminLive
      .from("kitchen_orders")
      .select("*")
      .neq("status", "cancelled")
      .is("paid_at", null)
      // Orders on credit are listed under Credit instead.
      .is("payment_method", null)
      .order("created_at", { ascending: true })
      .limit(500),
    supabaseAdminLive
      .from("kitchen_orders")
      .select("*")
      .neq("status", "cancelled")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(200),
  ]);

  const error = unpaid.error ?? paid.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ unpaid: (unpaid.data ?? []).map(withoutPrivate), paid: (paid.data ?? []).map(withoutPrivate) });
}
