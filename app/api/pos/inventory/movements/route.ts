export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { nextDocumentNumber, normaliseItem, normaliseMovement } from "@/lib/inventory/sheet";
import { amount, enteredBy, inventoryStaff, safeDate, text } from "@/lib/inventory/api";
import { KIND_LABEL, type MovementKind } from "@/lib/inventory/types";

/**
 * The ledger: reading it, and adding an entry by hand.
 *
 * Everything the stock screens do ends up here — the count sheet's cells, the
 * goods-received form, a dropped bottle, and the adjustment a posted count
 * wrote. One table, so "where did those four cans go" is one question with one
 * place to ask it.
 */

const KINDS = Object.keys(KIND_LABEL) as MovementKind[];

/** The kinds a person is allowed to key in directly. */
const ENTERABLE: MovementKind[] = ["opening", "received", "consumed", "writeoff", "waste"];

export async function GET(request: Request) {
  const { deny } = await inventoryStaff();
  if (deny) return deny;

  const url = new URL(request.url);
  const kinds = (url.searchParams.get("kind") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k): k is MovementKind => KINDS.includes(k as MovementKind));

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const itemId = url.searchParams.get("item_id");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 200, 1), 500);

  let query = supabaseAdminLive
    .from("inventory_movements")
    .select("*, item:inventory_items(id, name, uom, category)")
    .order("movement_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (kinds.length) query = query.in("kind", kinds);
  if (from) query = query.gte("movement_date", safeDate(from));
  if (to) query = query.lte("movement_date", safeDate(to));
  if (itemId) query = query.eq("item_id", itemId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    movements: (data ?? []).map((row) => normaliseMovement(row as Record<string, unknown>)),
  });
}

export async function POST(request: Request) {
  const { staff, deny } = await inventoryStaff();
  if (deny) return deny;

  const body = await request.json().catch(() => ({}));
  const kind = String(body?.kind ?? "") as MovementKind;

  if (!ENTERABLE.includes(kind)) {
    return NextResponse.json({ error: "That is not a movement you can key in" }, { status: 400 });
  }

  const quantity = amount(body?.quantity);
  if (quantity <= 0) return NextResponse.json({ error: "Enter a quantity" }, { status: 400 });

  const reason = text(body?.reason, 120);
  /* A quantity taken off the books without a reason is not something anyone
     can audit later, and "it was in the system" is not an answer to a
     stocktake. Deliveries and issues are self-explanatory; losses are not. */
  if ((kind === "writeoff" || kind === "waste") && !reason) {
    return NextResponse.json({ error: "Say why the stock is being written off" }, { status: 400 });
  }

  const itemRes = await supabaseAdminLive
    .from("inventory_items")
    .select("*")
    .eq("id", String(body?.item_id ?? ""))
    .maybeSingle();

  if (!itemRes.data) return NextResponse.json({ error: "Pick an item" }, { status: 400 });
  const item = normaliseItem(itemRes.data as Record<string, unknown>);

  const date = safeDate(body?.movement_date);

  /* Costed at what the item is worth today unless the entry says otherwise —
     a delivery at a new price is exactly when the figure differs, so the
     goods-received form offers it as a field. */
  const unitCost = body?.unit_cost === undefined || body?.unit_cost === "" ? item.unit_cost : amount(body.unit_cost);

  const reference =
    text(body?.reference, 80) ||
    (kind === "writeoff" || kind === "waste" ? await nextDocumentNumber(kind, date) : "");

  const row = {
    item_id: item.id,
    movement_date: date,
    kind,
    quantity,
    unit_cost: unitCost,
    reason,
    reference,
    note: text(body?.note, 300),
    entered_by: enteredBy(staff),
  };

  const { data, error } = await supabaseAdminLive
    .from("inventory_movements")
    .insert([row])
    .select("*, item:inventory_items(id, name, uom, category)")
    .single();

  if (error) {
    /* The partial unique indexes: one hand-typed received row and one consumed
       row per item per day, so the count sheet's cell has exactly one row to
       edit. Answered as a conflict with an explanation rather than a raw
       constraint name — the caller's next move is to change the existing
       figure, not to try again. */
    if (error.code === "23505") {
      return NextResponse.json(
        {
          error: `${item.name} already has ${KIND_LABEL[kind].toLowerCase()} recorded for that day. Change that figure on the count sheet instead of adding a second entry.`,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(normaliseMovement(data as Record<string, unknown>), { status: 201 });
}
