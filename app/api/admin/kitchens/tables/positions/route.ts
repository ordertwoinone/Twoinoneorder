export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { clampPosition } from "@/lib/table-layout";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Saves the whole floor map together, so a layout is never left half-applied silently. */
export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const positions = Array.isArray(body?.positions) ? body.positions : [];
  const valid = positions.every(
    (p: { id?: unknown; x?: unknown; y?: unknown }) =>
      typeof p?.id === "string" && UUID.test(p.id) && Number.isFinite(p.x) && Number.isFinite(p.y),
  );
  if (positions.length === 0 || positions.length > 500 || !valid) {
    return NextResponse.json({ error: "That layout isn't valid." }, { status: 400 });
  }

  const results = await Promise.all(
    positions.map((p: { id: string; x: number; y: number }) =>
      supabaseAdminLive
        .from("kitchen_tables")
        .update({
          pos_x: Math.round(clampPosition(p.x) * 100) / 100,
          pos_y: Math.round(clampPosition(p.y) * 100) / 100,
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.id),
    ),
  );

  revalidatePath("/kitchens");
  const failed = results.find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
