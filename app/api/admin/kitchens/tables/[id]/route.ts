export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { clashMessage, parseKitchenTable } from "@/lib/kitchen-tables";
import { supabaseAdminLive } from "@/lib/supabase-admin";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const parsed = parseKitchenTable(await request.json().catch(() => ({})));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await supabaseAdminLive
    .from("kitchen_tables")
    .update({ ...parsed.row, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();
  if (error?.code === "23505") return NextResponse.json({ error: clashMessage(parsed.row.code) }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/kitchens");
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdminLive.from("kitchen_tables").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/kitchens");
  return NextResponse.json({ success: true });
}
