export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Public endpoint consumed by the floating Spin & Win widget.
export async function GET() {
  const [{ data: settings }, { data: segments }] = await Promise.all([
    supabaseAdmin.from("spin_wheel_settings").select("*").single(),
    supabaseAdmin
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
