export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { DEFAULT_KIOSK_SETTINGS } from "@/lib/kiosk/types";

/**
 * Orders taken at the kiosk.
 *
 * The same bookings table every other order lives in, filtered to the ones the
 * screen took — so an order shows up here, on the live board and in Order
 * History at once, and marking it done in any of them is the same row.
 *
 * The order prefix travels with the list so the board can print "TIO-1048"
 * rather than a bare number, which is what the customer is holding.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "").trim();
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 200));

  let query = supabaseAdminLive
    .from("bookings")
    .select("*")
    .eq("type", "kiosk")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  const [ordersRes, settingsRes] = await Promise.all([
    query,
    supabaseAdminLive.from("kiosk_settings").select("order_prefix").limit(1).maybeSingle(),
  ]);

  if (ordersRes.error) {
    return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    orders: ordersRes.data ?? [],
    orderPrefix: settingsRes.data?.order_prefix ?? DEFAULT_KIOSK_SETTINGS.order_prefix,
  });
}
