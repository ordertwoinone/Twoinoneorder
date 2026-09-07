export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { buildSheet } from "@/lib/inventory/sheet";
import { amount, enteredBy, inventoryStaff, safeDate, text } from "@/lib/inventory/api";

/**
 * The count sheet: reading a day, and saving what was typed into it.
 *
 * The screen holds every edit locally until Apply is pressed, and then sends
 * only the lines that actually changed. That is what makes this route small —
 * it never has to work out which of twenty-eight rows the user touched, and
 * a sheet left open in a back-office tab cannot overwrite somebody else's
 * afternoon by re-submitting rows it read an hour ago.
 */

export async function GET(request: Request) {
  const { staff, deny } = await inventoryStaff();
  if (deny) return deny;

  const url = new URL(request.url);
  const date = safeDate(url.searchParams.get("date"));
  const location = text(url.searchParams.get("location"), 120);
  /* Optional. Absent is the one-day sheet the screen opens on; buildSheet also
     collapses a range that arrives back-to-front, so a half-typed date input
     cannot produce an error page. */
  const fromParam = url.searchParams.get("from");
  const from = fromParam ? safeDate(fromParam) : undefined;

  try {
    return NextResponse.json(await buildSheet({ date, from, location, enteredBy: enteredBy(staff) }));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

interface DirtyRow {
  item_id: string;
  /** Absent means "not touched"; a number means "make the day say this". */
  received?: number | null;
  consumed?: number | null;
  physical?: number | null;
  note?: string;
}

export async function PUT(request: Request) {
  const { staff, deny } = await inventoryStaff();
  if (deny) return deny;

  const body = await request.json().catch(() => ({}));
  const date = safeDate(body?.date);
  const location = text(body?.location, 120);
  const rows: DirtyRow[] = Array.isArray(body?.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "Nothing to apply" }, { status: 400 });
  }

  const sheet = await buildSheet({ date, location, enteredBy: enteredBy(staff) });
  if (sheet.count.status === "posted") {
    return NextResponse.json(
      { error: "This count has been posted. Start a new one to make further changes." },
      { status: 409 },
    );
  }

  const itemIds = rows.map((r) => String(r.item_id)).filter(Boolean);
  const known = new Map(sheet.rows.map((r) => [r.item.id, r.item]));

  /* The day's existing hand-typed movements, read once. A cell is one row per
     item per day per kind — see the partial unique indexes in
     supabase/inventory.sql — so this map is all the route needs to decide
     between an insert, an update and a delete. */
  const existingRes = await supabaseAdminLive
    .from("inventory_movements")
    .select("id, item_id, kind, quantity")
    .eq("movement_date", date)
    .in("kind", ["received", "consumed"])
    .in("item_id", itemIds);

  const existing = new Map<string, { id: string; quantity: number }>();
  for (const raw of existingRes.data ?? []) {
    const m = raw as { id: string; item_id: string; kind: string; quantity: number | string };
    existing.set(`${m.item_id}:${m.kind}`, { id: m.id, quantity: Number(m.quantity) });
  }

  const inserts: Record<string, unknown>[] = [];
  const updates: { id: string; quantity: number }[] = [];
  const deletes: string[] = [];
  const lines: Record<string, unknown>[] = [];

  for (const row of rows) {
    const item = known.get(String(row.item_id));
    // An item that is not on this sheet — filtered out by location, or
    // deactivated since the screen loaded — is skipped rather than booked.
    if (!item) continue;

    for (const kind of ["received", "consumed"] as const) {
      const value = row[kind];
      if (value === undefined) continue;

      const qty = amount(value);
      const current = existing.get(`${item.id}:${kind}`);

      if (qty <= 0) {
        // Cleared back to nothing: the row goes, rather than staying as a
        // zero-quantity movement cluttering the ledger for no reason.
        if (current) deletes.push(current.id);
      } else if (current) {
        if (current.quantity !== qty) updates.push({ id: current.id, quantity: qty });
      } else {
        inserts.push({
          item_id: item.id,
          movement_date: date,
          kind,
          quantity: qty,
          unit_cost: item.unit_cost,
          entered_by: enteredBy(staff),
        });
      }
    }

    if (row.physical !== undefined || row.note !== undefined) {
      lines.push({
        count_id: sheet.count.id,
        item_id: item.id,
        physical_count: row.physical === null || row.physical === undefined ? null : amount(row.physical),
        note: text(row.note, 200),
        updated_at: new Date().toISOString(),
      });
    }
  }

  const failures: string[] = [];
  const record = (error: { message: string } | null) => { if (error) failures.push(error.message); };

  if (inserts.length) {
    const { error } = await supabaseAdminLive.from("inventory_movements").insert(inserts);
    record(error);
  }
  if (deletes.length) {
    const { error } = await supabaseAdminLive.from("inventory_movements").delete().in("id", deletes);
    record(error);
  }
  for (const u of updates) {
    const { error } = await supabaseAdminLive
      .from("inventory_movements")
      .update({ quantity: u.quantity, updated_at: new Date().toISOString() })
      .eq("id", u.id);
    record(error);
  }
  if (lines.length) {
    const { error } = await supabaseAdminLive
      .from("inventory_count_lines")
      .upsert(lines, { onConflict: "count_id,item_id" });
    record(error);
  }

  if (failures.length) {
    return NextResponse.json({ error: failures[0] }, { status: 500 });
  }

  // The fresh sheet, not an "ok" — every derived column has just moved, and the
  // screen would otherwise have to guess at the new closing balances itself.
  return NextResponse.json(await buildSheet({ date, location, enteredBy: enteredBy(staff) }));
}
