export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/**
 * Public endpoint consumed by the floating Spin & Win widget.
 *
 * supabaseAdminLive, not supabaseAdmin: the cacheable client answers this from
 * Next's data cache, so switching the wheel to Hidden in admin left it still
 * turning on the site — the route re-ran on every request, but the PostgREST
 * fetch inside it did not. The widget already asks with `cache: "no-store"`,
 * so there was never a cache to benefit from here, only one to be wrong.
 */
export async function GET() {
  const [{ data: settings }, { data: segments }] = await Promise.all([
    supabaseAdminLive.from("spin_wheel_settings").select("*").single(),
    supabaseAdminLive
      .from("spin_wheel_segments")
      .select("id, label, code, color, weight, is_winning, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (!settings || !settings.is_enabled) {
    return NextResponse.json({ enabled: false });
  }

  return NextResponse.json({
    enabled: true,
    settings,
    segments: segments || [],
  });
}
