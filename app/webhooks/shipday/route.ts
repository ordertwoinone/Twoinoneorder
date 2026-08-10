export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { toDeliveryRow, supersedes, webhookToken, type ShipdayWebhookPayload } from "@/lib/shipday";

/**
 * Shipday delivery events.
 *
 * Public by design — Shipday is not carrying an admin session — so the shared
 * token it sends in the `token` header is the only thing standing between this
 * route and anyone who guesses the URL. An unverified body is never read.
 *
 * The reply is 200 as soon as the row is written; anything Shipday does not
 * hear back from quickly it retries, and a duplicate delivery is harmless
 * because the write upserts on the Shipday order id.
 */

/**
 * The token check, in constant time.
 *
 * `!==` on a secret leaks its prefix through how long the comparison runs, and
 * this token is the whole of the route's authentication. Lengths are compared
 * first because timingSafeEqual throws on a mismatch — that much is already
 * public from the header itself.
 */
function tokenMatches(sent: string, expected: string): boolean {
  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = webhookToken();
  if (!expected) {
    console.error("[shipday webhook] no verification token is set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  if (!tokenMatches(request.headers.get("token") ?? "", expected)) {
    console.warn("[shipday webhook] rejected: token did not match");
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let payload: ShipdayWebhookPayload;
  try {
    payload = (await request.json()) as ShipdayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const event = String(payload?.event ?? "");
  const row = toDeliveryRow(payload);

  /* A body we cannot key on is not worth retrying — 400 says so once, where a
     500 would have Shipday redeliver something we will never be able to store. */
  if (!event || !row) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  /* ORDER_DELETE is the delivery being withdrawn in Shipday. Dropping the row
     is what keeps the board honest — a deleted delivery is not a stalled one. */
  if (event === "ORDER_DELETE") {
    const { error } = await supabaseAdminLive.from("shipday_deliveries").delete().eq("id", row.id);
    if (error) {
      console.error("[shipday webhook] could not delete delivery:", error.message);
      return NextResponse.json({ error: "Could not delete delivery" }, { status: 500 });
    }
    return NextResponse.json({ received: true, deleted: row.id });
  }

  /* Deliveries are not ordered, so a retry of an early event can arrive after a
     later one. Comparing Shipday's own clock keeps a finished delivery finished
     rather than letting a redelivered ORDER_ASSIGNED reset it. */
  const { data: stored } = await supabaseAdminLive
    .from("shipday_deliveries")
    .select("event_at")
    .eq("id", row.id)
    .maybeSingle();

  const storedAt = (stored as { event_at: string | null } | null)?.event_at;
  if (!supersedes(row.event_at, storedAt)) {
    // Acknowledged, not applied: replying 200 stops Shipday retrying it.
    return NextResponse.json({ received: true, ignored: "older than stored event" });
  }

  const { error } = await supabaseAdminLive
    .from("shipday_deliveries")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(row as any, { onConflict: "id" });

  if (error) {
    // A 500 asks Shipday to deliver it again rather than losing the update.
    console.error("[shipday webhook] could not store delivery:", error.message);
    return NextResponse.json({ error: "Could not store delivery" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
