export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { parseKitchenCategory } from "@/lib/kitchens";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const parsed = parseKitchenCategory(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await supabaseAdminLive
    .from("kitchen_categories")
    .update({ ...parsed.row, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/kitchens");
  return NextResponse.json(data);
}

/** Dishes keep the id, but the page only shows categories that still exist. */
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdminLive.from("kitchen_categories").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/kitchens");
  return NextResponse.json({ success: true });
}
