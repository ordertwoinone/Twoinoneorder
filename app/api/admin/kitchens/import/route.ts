export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { insertRow, updateRow } from "@/lib/admin-write";
import { getKitchenAddonGroups, KITCHEN_TABLES, syncItemAddonGroups } from "@/lib/kalba/addons-server";
import { parseKitchenDish } from "@/lib/kitchens";
import type { ImportDish } from "@/lib/kitchens-import";
import { supabaseAdminLive } from "@/lib/supabase-admin";

const MAX_DISHES = 500;

const keyOf = (meal: string, name: string) => `${meal}|${name.trim().toLowerCase()}`;

/**
 * Saves dishes read from a menu spreadsheet.
 *
 * A dish already on the menu has only its price and description refreshed, so
 * re-uploading a corrected file does not create doubles or wipe the photos,
 * Arabic and settings added since. It gains the file's add-ons only if it has none.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const kitchen = body?.kitchen;
  const dishes: ImportDish[] = Array.isArray(body?.dishes) ? body.dishes : [];

  if (dishes.length === 0) return NextResponse.json({ error: "There are no dishes to import." }, { status: 400 });
  if (dishes.length > MAX_DISHES) {
    return NextResponse.json({ error: `Import at most ${MAX_DISHES} dishes at a time.` }, { status: 400 });
  }

  const { data: existing, error } = await supabaseAdminLive
    .from("kitchen_dishes")
    .select("id, meal, name, sort_order")
    .eq("kitchen", kitchen);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (existing ?? []) as { id: string; meal: string; name: string; sort_order: number }[];
  const byKey = new Map(rows.map((r) => [keyOf(r.meal, r.name), r.id]));
  const groupsByDish = await getKitchenAddonGroups(true);
  let nextOrder = rows.reduce((max, r) => Math.max(max, r.sort_order), -1) + 1;

  let created = 0;
  let updated = 0;
  const failed: { name: string; error: string }[] = [];
  const dropped = new Set<string>();

  // One at a time, so one bad row costs that row and the count stays accurate.
  for (const dish of dishes) {
    const parsed = parseKitchenDish({
      meal: dish.meal,
      kitchen,
      name: dish.name,
      description: dish.description,
      price: dish.price,
      serves: 1,
      is_active: body?.active !== false,
      sort_order: nextOrder,
    });
    if ("error" in parsed) {
      failed.push({ name: String(dish.name ?? ""), error: parsed.error });
      continue;
    }

    const existingId = byKey.get(keyOf(parsed.row.meal, parsed.row.name));
    const result = existingId
      ? await updateRow("kitchen_dishes", existingId, {
          description: parsed.row.description,
          price: parsed.row.price,
        })
      : await insertRow("kitchen_dishes", parsed.row);

    if (result.error) {
      failed.push({ name: parsed.row.name, error: result.error.message ?? "Could not save." });
      continue;
    }

    const id = existingId ?? (result.data as { id: string }).id;
    if (existingId) {
      updated += 1;
    } else {
      created += 1;
      nextOrder += 1;
      byKey.set(keyOf(parsed.row.meal, parsed.row.name), id);
    }

    const addons = Array.isArray(dish.addons) ? dish.addons : [];
    if (addons.length > 0 && !groupsByDish[id]?.length) {
      const { droppedColumns } = await syncItemAddonGroups(
        id,
        [{
          name: "Add-ons",
          name_ar: "إضافات",
          min_select: 0,
          max_select: 0,
          options: addons.map((a) => ({ name: a.name, price: a.price })),
        }],
        KITCHEN_TABLES,
      );
      droppedColumns.forEach((c) => dropped.add(c));
    }
  }

  revalidatePath("/kitchens");
  return NextResponse.json({ created, updated, failed, droppedColumns: Array.from(dropped) });
}
