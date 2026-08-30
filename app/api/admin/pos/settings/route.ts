export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { insertRow, updateRow } from "@/lib/admin-write";
import { DEFAULT_POS_SETTINGS } from "@/lib/pos/settings";

async function currentRow() {
  const { data } = await supabaseAdminLive.from("pos_settings").select("*").limit(1).maybeSingle();
  return data as (Record<string, unknown> & { id: string }) | null;
}

export async function GET() {
  const existing = await currentRow();
  if (existing) return NextResponse.json(existing);

  const { data, error } = await insertRow("pos_settings", { ...DEFAULT_POS_SETTINGS });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const existing = await currentRow();

  const { data, error } = existing
    ? await updateRow("pos_settings", existing.id, body)
    : await insertRow("pos_settings", body);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
