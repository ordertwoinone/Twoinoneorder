export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { updateRow } from "@/lib/admin-write";
import { KITCHEN_TABLES, syncItemAddonGroups, type GroupInput } from "@/lib/kalba/addons-server";
import { parseKitchenDish } from "@/lib/kitchens";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const parsed = parseKitchenDish(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await updateRow("kitchen_dishes", params.id, parsed.row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { droppedColumns } = await syncItemAddonGroups(
    params.id,
    (body.addon_groups ?? []) as GroupInput[],
    KITCHEN_TABLES,
  );
  revalidatePath("/kitchens");
  return NextResponse.json({ ...(data as object), droppedColumns });
}

/** Stars or unstars a dish without touching anything else about it. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  if (typeof body?.is_favorite !== "boolean") {
    return NextResponse.json({ error: "That change isn't valid." }, { status: 400 });
  }

  const { error } = await supabaseAdminLive
    .from("kitchen_dishes")
    .update({ is_favorite: body.is_favorite, updated_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) {
    const missing = (error.message ?? "").includes("is_favorite");
    return NextResponse.json(
      { error: missing ? "Run supabase/kitchen_dish_favorites.sql in the Supabase SQL editor first." : error.message },
      { status: 500 },
    );
  }
  revalidatePath("/kitchens");
  return NextResponse.json({ success: true });
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
