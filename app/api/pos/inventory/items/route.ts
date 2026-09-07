export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { normaliseItem, stockOnHand } from "@/lib/inventory/sheet";
import { amount, enteredBy, inventoryStaff, safeDate, text } from "@/lib/inventory/api";

/** What is stocked, and what the ledger says is left of it. */
export async function GET() {
  const { deny } = await inventoryStaff();
  if (deny) return deny;

  const [itemsRes, balances] = await Promise.all([
    supabaseAdminLive
      .from("inventory_items")
      .select("*")
      .order("category")
      .order("sort_order")
      .order("name"),
    stockOnHand(),
  ]);

  if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });

  const items = (itemsRes.data ?? []).map((row) => {
    const item = normaliseItem(row as Record<string, unknown>);
    return { ...item, on_hand: balances.get(item.id) ?? 0 };
  });

  return NextResponse.json({ items });
}

/**
 * Adding something to the shelf.
 *
 * The opening quantity is not a column on the item — it is booked straight into
 * the ledger as an `opening` movement, so a new item's stock has a dated row
 * behind it from its first day like every other figure in here.
 */
export async function POST(request: Request) {
  const { staff, deny } = await inventoryStaff();
  if (deny) return deny;

  const body = await request.json().catch(() => ({}));
  const name = text(body?.name, 160);
  if (!name) return NextResponse.json({ error: "Give the item a name" }, { status: 400 });

  const row = {
    name,
    name_ar: text(body?.name_ar, 160),
    sku: text(body?.sku, 60) || null,
    category: text(body?.category, 80) || "Uncategorised",
    uom: text(body?.uom, 30) || "Unit",
    location: text(body?.location, 120),
    unit_cost: amount(body?.unit_cost),
    nrv: amount(body?.nrv),
    reorder_level: amount(body?.reorder_level),
    image_url: text(body?.image_url, 500),
    is_active: body?.is_active !== false,
    sort_order: Math.trunc(amount(body?.sort_order)),
  };

  const { data, error } = await supabaseAdminLive
    .from("inventory_items")
    .insert([row])
    .select()
    .single();

  if (error) {
    const clash = error.code === "23505";
    return NextResponse.json(
      { error: clash ? "Another item already uses that item code" : error.message },
      { status: clash ? 409 : 500 },
    );
  }

  const item = normaliseItem(data as Record<string, unknown>);
  const opening = amount(body?.opening_quantity);

  if (opening > 0) {
    await supabaseAdminLive.from("inventory_movements").insert([
      {
        item_id: item.id,
        movement_date: safeDate(body?.opening_date),
        kind: "opening",
        quantity: opening,
        unit_cost: item.unit_cost,
        reason: "Opening balance",
        entered_by: enteredBy(staff),
      },
    ]);
  }

  return NextResponse.json({ ...item, on_hand: opening }, { status: 201 });
}
