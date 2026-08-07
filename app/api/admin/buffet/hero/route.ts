export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { insertRow, updateRow } from "@/lib/admin-write";

export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("buffet_hero")
    .select("*")
    .limit(1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const body = await request.json();

  // Try update first; if no row exists, insert one
  const { data: existing } = await supabaseAdminLive
    .from("buffet_hero")
    .select("id")
    .limit(1)
    .single();

  let result;
  if (existing?.id) {
    result = await updateRow("buffet_hero", existing.id, body);
  } else {
    result = await insertRow("buffet_hero", body);
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  revalidatePath("/restaurant/buffet");
  return NextResponse.json(result.data);
}
