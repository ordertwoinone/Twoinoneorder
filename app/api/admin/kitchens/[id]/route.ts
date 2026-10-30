export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { updateRow } from "@/lib/admin-write";
import { parseKitchenDish } from "@/lib/kitchens";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const parsed = parseKitchenDish(await request.json());
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await updateRow("kitchen_dishes", params.id, parsed.row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/kitchens");
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdminLive
    .from("kitchen_dishes")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/kitchens");
  return NextResponse.json({ success: true });
}
