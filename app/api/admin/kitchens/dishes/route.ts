export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { insertRow } from "@/lib/admin-write";
import { getKitchenAddonGroups, KITCHEN_TABLES, syncItemAddonGroups, type GroupInput } from "@/lib/kalba/addons-server";
import { parseKitchenDish } from "@/lib/kitchens";

export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("kitchen_dishes")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const byItem = await getKitchenAddonGroups(true);
  return NextResponse.json((data ?? []).map((row) => ({ ...row, addon_groups: byItem[row.id] ?? [] })));
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = parseKitchenDish(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await insertRow("kitchen_dishes", parsed.row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { droppedColumns } = await syncItemAddonGroups(
    (data as { id: string }).id,
    (body.addon_groups ?? []) as GroupInput[],
    KITCHEN_TABLES,
  );
  revalidatePath("/kitchens");
  return NextResponse.json({ ...(data as object), droppedColumns }, { status: 201 });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Each id goes in the request URL, so a long list is sent in pieces.
const DELETE_BATCH = 100;

/** Deletes several dishes. Their add-ons go with them; past orders keep their own copy. */
export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
  if (ids.length === 0 || ids.some((id) => typeof id !== "string" || !UUID.test(id))) {
    return NextResponse.json({ error: "Choose at least one dish." }, { status: 400 });
  }

  let deleted = 0;
  let failure: string | null = null;
  for (let i = 0; i < ids.length; i += DELETE_BATCH) {
    const { error } = await supabaseAdminLive
      .from("kitchen_dishes")
      .delete()
      .in("id", ids.slice(i, i + DELETE_BATCH));
    if (error) {
      failure = error.message;
      break;
    }
    deleted += Math.min(DELETE_BATCH, ids.length - i);
  }

  revalidatePath("/kitchens");
  if (failure) return NextResponse.json({ error: failure, deleted }, { status: 500 });
  return NextResponse.json({ deleted });
}
