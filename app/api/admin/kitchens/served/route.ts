export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withoutPrivate } from "@/lib/kitchen-orders";
import { supabaseAdminLive } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("kitchen_orders")
    .select("*")
    .eq("status", "served")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(withoutPrivate));
}
