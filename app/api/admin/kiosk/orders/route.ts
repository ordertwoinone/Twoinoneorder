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
  const device = (searchParams.get("device") ?? "").trim();
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 200));

  let query = supabaseAdminLive
    .from("bookings")
    .select("*")
    .eq("type", "kiosk")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);
  // "none" is a real answer: orders from the unnamed /kiosk, or from before
  // the panels were registered.
  if (device === "none") query = query.is("kiosk_device_id", null);
  else if (device) query = query.eq("kiosk_device_id", device);

  const [ordersRes, settingsRes, devicesRes] = await Promise.all([
    query,
    supabaseAdminLive.from("kiosk_settings").select("order_prefix").limit(1).maybeSingle(),
    supabaseAdminLive
      .from("kiosk_devices")
      .select("id, slug, label")
      .order("sort_order", { ascending: true }),
  ]);

  if (ordersRes.error) {
    return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    orders: ordersRes.data ?? [],
    orderPrefix: settingsRes.data?.order_prefix ?? DEFAULT_KIOSK_SETTINGS.order_prefix,
    // Empty when the devices table is not there yet; the board just drops the
    // per-screen filter rather than failing.
    devices: devicesRes.error ? [] : (devicesRes.data ?? []),
  });
}
