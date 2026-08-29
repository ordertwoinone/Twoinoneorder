export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/**
 * The menu, for the combo picker on admin → Kiosk → Screen.
 *
 * Its own read-only endpoint rather than reusing /api/admin/kalba/popular:
 * access is decided per path, not per method, so claiming that one for the
 * Kiosk area would hand a kiosk-only member the ability to edit the Kalba menu
 * as well. This answers with the four fields the picker draws and nothing else.
 */
export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("kalba_popular_items")
    .select("id, name, price, is_active")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
