export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";

// Every column, so the discount and part payments show once their SQL has run.
const COLUMNS = "*";
const withoutTracking = <T extends Record<string, unknown>>(row: T) => {
  const rest: Record<string, unknown> = { ...row };
  delete rest.ip_hash;
  delete rest.client_ref;
  return rest;
};

/** Read separately, so a long settled history can never crowd out money still owed. */
export async function GET() {
  const [outstanding, settled] = await Promise.all([
    supabaseAdminLive
      .from("kitchen_orders")
      .select(COLUMNS)
      .neq("status", "cancelled")
      .eq("payment_method", "credit")
      .is("paid_at", null)
      .order("credit_at", { ascending: true })
      .limit(500),
    supabaseAdminLive
      .from("kitchen_orders")
      .select(COLUMNS)
      .neq("status", "cancelled")
      .not("credit_at", "is", null)
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(200),
  ]);

  const error = outstanding.error ?? settled.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ outstanding: (outstanding.data ?? []).map(withoutTracking), settled: (settled.data ?? []).map(withoutTracking) });
}
