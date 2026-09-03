export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import {
  queryOrders, fetchActiveOrders, fromApiOrder, fromActiveOrder,
  supersedes, apiKey, ShipdayError,
} from "@/lib/shipday";
import type { ShipdayDeliveryRow } from "@/lib/shipday";

/**
 * Pull what Shipday already holds onto the board.
 *
 * The webhook only ever reports what happens *next*, so an order Shipday took
 * before the webhook was connected — or during any window where deliveries
 * were failing — never appears. This asks Shipday for its orders directly and
 * writes them in, which is also the honest answer to "is Shipday even seeing
 * our orders": if this returns nothing, the gap is upstream of us.
 *
 * Rows already written by a webhook are left alone unless the API's copy is at
 * least as recent, so a backfill can never undo a live update.
 */
export async function POST() {
  if (!apiKey()) {
    return NextResponse.json(
      { error: "No Shipday API key is set. Add SHIPDAY_API_KEY to the hosting environment." },
      { status: 400 },
    );
  }

  /* Both lists, because neither alone answers the question. GET /orders returns
     only what is still in flight — the ongoing deliveries this board is for —
     while /orders/query reaches back over finished ones. Asking only the first
     would report "Shipday has nothing" for an account whose orders have all
     been delivered, which is a very different problem from orders never
     arriving at Shipday at all. */
  const [active, queried] = await Promise.allSettled([fetchActiveOrders(), queryOrders()]);

  // Only when *both* fail is there nothing to say; one failing still leaves a list.
  if (active.status === "rejected" && queried.status === "rejected") {
    const err = active.reason;
    const message = err instanceof ShipdayError ? err.message : "Could not reach Shipday.";
    const status = err instanceof ShipdayError ? err.status : 502;
    return NextResponse.json({ error: message }, { status: status === 403 ? 502 : status });
  }

  const activeRows =
    active.status === "fulfilled"
      ? active.value.map(fromActiveOrder).filter((r): r is ShipdayDeliveryRow => r !== null)
      : [];
  const queriedRows =
    queried.status === "fulfilled"
      ? queried.value.map(fromApiOrder).filter((r): r is ShipdayDeliveryRow => r !== null)
      : [];

  /* An order in both lists is described more fully by the active one, so it
     wins; the query list only fills in what active did not carry. */
  const byId = new Map<string, ShipdayDeliveryRow>();
  queriedRows.forEach((row) => byId.set(row.id, row));
  activeRows.forEach((row) => byId.set(row.id, row));
  const rows = Array.from(byId.values());

  if (rows.length === 0) {
    /* Not an error: Shipday answered, and it has nothing. Said plainly so the
       screen can distinguish "we could not ask" from "there is nothing there". */
    return NextResponse.json({
      found: 0, written: 0, skipped: 0, active: 0,
      message: "Shipday returned no orders.",
    });
  }

  /* One read of the ids we already hold, rather than one per order. */
  const { data: existing } = await supabaseAdminLive
    .from("shipday_deliveries")
    .select("id, event_at")
    .in("id", rows.map((r) => r.id));

  const storedAt = new Map(
    ((existing ?? []) as { id: string; event_at: string | null }[]).map((r) => [r.id, r.event_at]),
  );

  const fresh = rows.filter((row) => supersedes(row.event_at, storedAt.get(row.id)));

  if (fresh.length > 0) {
    const { error } = await supabaseAdminLive
      .from("shipday_deliveries")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(fresh as any, { onConflict: "id" });

    if (error) {
      return NextResponse.json({ error: `Could not store deliveries: ${error.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    found: rows.length,
    active: activeRows.length,
    written: fresh.length,
    skipped: rows.length - fresh.length,
  });
}
