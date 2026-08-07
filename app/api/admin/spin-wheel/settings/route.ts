export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { updateRow } from "@/lib/admin-write";

export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("spin_wheel_settings")
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, created_at: _created_at, ...fields } = body;

  const { data, error } = await updateRow("spin_wheel_settings", id, fields);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/");
  return NextResponse.json(data);
}
