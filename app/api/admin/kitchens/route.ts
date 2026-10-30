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
