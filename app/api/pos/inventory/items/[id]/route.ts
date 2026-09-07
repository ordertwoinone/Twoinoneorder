export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { normaliseItem } from "@/lib/inventory/sheet";
import { amount, inventoryStaff, text } from "@/lib/inventory/api";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { deny } = await inventoryStaff();
  if (deny) return deny;

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  /* Only the fields actually sent. The screen edits one item at a time but the
     valuation list toggles is_active on its own, and a blanket assignment would
     have that toggle blank out the name. */
  if (body?.name !== undefined) {
    const name = text(body.name, 160);
    if (!name) return NextResponse.json({ error: "Give the item a name" }, { status: 400 });
    patch.name = name;
  }
  if (body?.name_ar !== undefined) patch.name_ar = text(body.name_ar, 160);
  if (body?.sku !== undefined) patch.sku = text(body.sku, 60) || null;
  if (body?.category !== undefined) patch.category = text(body.category, 80) || "Uncategorised";
  if (body?.uom !== undefined) patch.uom = text(body.uom, 30) || "Unit";
  if (body?.location !== undefined) patch.location = text(body.location, 120);
  if (body?.unit_cost !== undefined) patch.unit_cost = amount(body.unit_cost);
  if (body?.nrv !== undefined) patch.nrv = amount(body.nrv);
  if (body?.reorder_level !== undefined) patch.reorder_level = amount(body.reorder_level);
  if (body?.image_url !== undefined) patch.image_url = text(body.image_url, 500);
  if (body?.is_active !== undefined) patch.is_active = Boolean(body.is_active);
  if (body?.sort_order !== undefined) patch.sort_order = Math.trunc(amount(body.sort_order));

  const { data, error } = await supabaseAdminLive
    .from("inventory_items")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    const clash = error.code === "23505";
    return NextResponse.json(
      { error: clash ? "Another item already uses that item code" : error.message },
      { status: clash ? 409 : 500 },
    );
  }

  return NextResponse.json(normaliseItem(data as Record<string, unknown>));
}

/**
 * Removing an item.
 *
 * Deleting takes its whole movement history with it (ON DELETE CASCADE), so an
 * item that has ever moved is refused and switched off instead. A discontinued
 * drink has to stay in last quarter's valuation — the stock was really there
 * and it was really worth something, and a shelf going empty is not a reason
 * for the books to forget it ever existed.
 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { deny } = await inventoryStaff();
  if (deny) return deny;

  const { count } = await supabaseAdminLive
    .from("inventory_movements")
    .select("id", { count: "exact", head: true })
    .eq("item_id", params.id);

  if ((count ?? 0) > 0) {
    const { error } = await supabaseAdminLive
      .from("inventory_items")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      deactivated: true,
      message: "This item has stock movements behind it, so it has been switched off rather than deleted. Its history stays in the ledger and the valuation.",
    });
  }

  const { error } = await supabaseAdminLive.from("inventory_items").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, deactivated: false });
}
