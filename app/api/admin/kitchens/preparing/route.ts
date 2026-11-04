export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withoutPrivate } from "@/lib/kitchen-orders";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/** Orders the waiters can still change: not served or cancelled yet. */
export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("kitchen_orders")
    .select("*")
    .in("status", ["new", "preparing", "ready"])
    .order("created_at", { ascending: true })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(withoutPrivate));
}
