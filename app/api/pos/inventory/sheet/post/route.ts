export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { buildSheet } from "@/lib/inventory/sheet";
import { enteredBy, inventoryStaff, safeDate, text } from "@/lib/inventory/api";
import { bookClosing, carryingRate, variance } from "@/lib/inventory/types";

/**
 * Accepting a count.
 *
 * Up to this point a physical count is an observation sitting beside the books
 * and disagreeing with them. Posting is the moment somebody says the shelf was
 * right and the books were wrong, and it writes that decision into the ledger
 * as an adjustment per line — signed, dated to the day counted, and tagged with
 * the count that caused it.
 *
 * Which is why it is one-way. The adjustments are ordinary movements from then
 * on: the next day's opening balance is built from them, and unwinding a posted
 * count after a week of trading would silently restate every day since. A count
 * posted in error is corrected by counting again, the same as it would be on
 * paper.
 */
export async function POST(request: Request) {
  const { staff, deny } = await inventoryStaff();
  if (deny) return deny;

  const body = await request.json().catch(() => ({}));
  const date = safeDate(body?.date);
  const location = text(body?.location, 120);

  const sheet = await buildSheet({ date, location, enteredBy: enteredBy(staff) });

  if (sheet.count.status === "posted") {
    return NextResponse.json({ error: "This count is already posted." }, { status: 409 });
  }

  const counted = sheet.rows.filter((row) => row.physical !== null);
  if (counted.length === 0) {
    return NextResponse.json(
      { error: "Nothing has been counted yet. Enter at least one physical count first." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  /* What the books said, at the moment they were overruled. Snapshots rather
     than a join, so re-pricing an item next month cannot rewrite what this
     count was worth — the sheet has to still read the same in an audit a year
     from now. */
  const lines = counted.map((row) => ({
    count_id: sheet.count.id,
    item_id: row.item.id,
    physical_count: row.physical,
    book_closing: bookClosing(row),
    variance: variance(row),
    unit_cost: row.item.unit_cost,
    nrv: row.item.nrv,
    updated_at: now,
  }));

  const linesRes = await supabaseAdminLive
    .from("inventory_count_lines")
    .upsert(lines, { onConflict: "count_id,item_id" });

  if (linesRes.error) {
    return NextResponse.json({ error: linesRes.error.message }, { status: 500 });
  }

  /* Claimed before a single adjustment is written, and only from draft.
     Two people pressing Post in the same second would otherwise both pass the
     check at the top and both write a full set of adjustments, doubling every
     variance in the ledger. Whoever's update matches the row wins; the other
     is told it is already posted and writes nothing. */
  const claim = await supabaseAdminLive
    .from("inventory_counts")
    .update({
      status: "posted",
      posted_at: now,
      entered_by: enteredBy(staff),
      notes: text(body?.notes, 500) || sheet.count.notes,
      updated_at: now,
    })
    .eq("id", sheet.count.id)
    .eq("status", "draft")
    .select("id");

  if (claim.error) return NextResponse.json({ error: claim.error.message }, { status: 500 });
  if ((claim.data ?? []).length === 0) {
    return NextResponse.json({ error: "This count is already posted." }, { status: 409 });
  }

  /* Only the lines that disagreed. A count that matched needs no adjustment,
     and writing a zero-quantity movement for every matching item would bury the
     three rows that actually moved under twenty-five that did not. */
  const adjustments = counted
    .map((row) => ({ row, delta: variance(row) ?? 0 }))
    .filter(({ delta }) => delta !== 0)
    .map(({ row, delta }) => ({
      item_id: row.item.id,
      movement_date: date,
      kind: "count_adjustment",
      // Signed on purpose: negative is stock the count could not find.
      quantity: delta,
      unit_cost: carryingRate(row.item),
      reason: delta < 0 ? "Count shortage" : "Count excess",
      reference: sheet.count.reference,
      count_id: sheet.count.id,
      entered_by: enteredBy(staff),
    }));

  if (adjustments.length) {
    const { error } = await supabaseAdminLive.from("inventory_movements").insert(adjustments);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    posted: true,
    reference: sheet.count.reference,
    counted: counted.length,
    adjustments: adjustments.length,
    sheet: await buildSheet({ date, location, enteredBy: enteredBy(staff) }),
  });
}
