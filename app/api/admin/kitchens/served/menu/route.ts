export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getLiveKitchenAddonGroups } from "@/lib/kalba/addons-server";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/** What can be added to an order right now. */
export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("kitchen_dishes")
    .select("id, name, price, kitchen, meal")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dishes: data, groups: await getLiveKitchenAddonGroups() });
}
