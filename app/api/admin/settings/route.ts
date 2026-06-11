export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, created_at: _created_at, ...fields } = body;

  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/");
  revalidatePath("/admin");
  return NextResponse.json(data);
}

