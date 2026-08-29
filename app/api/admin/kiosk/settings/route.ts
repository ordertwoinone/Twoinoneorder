export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { insertRow, updateRow } from "@/lib/admin-write";
import { DEFAULT_KIOSK_SETTINGS } from "@/lib/kiosk/types";

/**
 * The kiosk screen's one row of settings.
 *
 * There is only ever one, so GET creates it on first open rather than handing
 * the admin screen an empty form with nothing to save onto.
 */

async function currentRow() {
  const { data } = await supabaseAdminLive.from("kiosk_settings").select("*").limit(1).maybeSingle();
  return data as (Record<string, unknown> & { id: string }) | null;
}

export async function GET() {
  const existing = await currentRow();
  if (existing) return NextResponse.json(existing);

  const { data, error } = await insertRow("kiosk_settings", { ...DEFAULT_KIOSK_SETTINGS });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const existing = await currentRow();

  const { data, error } = existing
    ? await updateRow("kiosk_settings", existing.id, body)
    : await insertRow("kiosk_settings", body);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/kiosk");
  return NextResponse.json(data);
}
