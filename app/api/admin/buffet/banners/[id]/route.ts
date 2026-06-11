export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { data, error } = await supabaseAdmin
    .from("buffet_banners")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/restaurant/buffet");
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdmin
    .from("buffet_banners")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/restaurant/buffet");
  return NextResponse.json({ success: true });
}
