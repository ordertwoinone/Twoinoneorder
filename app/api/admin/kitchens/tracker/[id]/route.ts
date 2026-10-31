export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/** The one change the tracker can make: a ready order has reached its table. */
export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdminLive
    .from("kitchen_orders")
    .update({ status: "served", served_at: now, updated_at: now })
    .eq("id", params.id)
    .eq("status", "ready")
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "That order is no longer ready." }, { status: 409 });
  return NextResponse.json({ success: true });
}
