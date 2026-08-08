export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Webhook, WebhookVerificationError } from "svix";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { toOrderRow } from "@/lib/takeapp-order-row";
import { pushToAdmins } from "@/lib/push";
import type { TakeAppOrder } from "@/lib/takeapp-orders";

/**
 * take.app order events, signed with Svix.
 *
 * Public by design — take.app is not carrying an admin session — so the
 * signature is the only thing standing between this route and anyone who
 * guesses the URL. An unverified body is never read.
 *
 * The reply is 200 as soon as the row is written; anything take.app does not
 * hear back from quickly it retries, and a duplicate delivery is harmless
 * because the write upserts on the order id.
 */

/**
 * Svix base64-decodes whatever follows `whsec_`, and throws outright on a
 * secret written in the base64url alphabet — which is how take.app issues them
 * (`-` and `_` in place of `+` and `/`). Same key bytes either way, so translate
 * the alphabet and pad it rather than making the route 500 on every delivery.
 */
function svixSecret(secret: string): string {
  const [, body = ""] = /^whsec_(.*)$/.exec(secret) ?? [, secret];
  if (!/[-_]/.test(body)) return secret;

  const standard = body.replace(/-/g, "+").replace(/_/g, "/");
  const padded = standard.padEnd(standard.length + ((4 - (standard.length % 4)) % 4), "=");
  return `whsec_${padded}`;
}

/** The event names that carry an order we care about. */
function isOrderEvent(type: string): boolean {
  return type.toUpperCase().startsWith("ORDER");
}

/** take.app puts the order at the top level or under `data` depending on event. */
function orderFrom(payload: Record<string, unknown>): TakeAppOrder | null {
  const candidate = (payload.data ?? payload.order ?? payload) as Record<string, unknown>;
  if (!candidate || typeof candidate !== "object") return null;
  return typeof candidate.id === "string" || typeof candidate.id === "number"
    ? (candidate as unknown as TakeAppOrder)
    : null;
}

export async function POST(request: Request) {
  const secret = process.env.TAKEAPP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[takeapp webhook] TAKEAPP_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Svix signs the exact bytes sent, so the raw text has to be verified before
  // it is parsed — JSON.parse and re-stringify would not match the signature.
  const body = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  let payload: Record<string, unknown>;
  try {
    payload = new Webhook(svixSecret(secret)).verify(body, headers) as Record<string, unknown>;
  } catch (err) {
    const reason = err instanceof WebhookVerificationError ? err.message : "Invalid signature";
    console.warn("[takeapp webhook] rejected:", reason);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = String(payload.type ?? payload.event ?? "");

  // Acknowledge anything else — a 200 stops take.app retrying an event that we
  // simply have no use for.
  if (!isOrderEvent(event)) {
    return NextResponse.json({ received: true, ignored: event || "unknown" });
  }

  const order = orderFrom(payload);
  if (!order) {
    console.warn("[takeapp webhook] order event carried no order:", event);
    return NextResponse.json({ received: true, ignored: "no order in payload" });
  }

  /* `select` tells us whether this was an arrival or an update: an order we
     already had must not ring anyone's phone a second time. */
  const { data: before } = await supabaseAdminLive
    .from("takeapp_orders")
    .select("id")
    .eq("id", String(order.id))
    .maybeSingle();

  const { error } = await supabaseAdminLive
    .from("takeapp_orders")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(toOrderRow(order, event) as any, { onConflict: "id" });

  if (error) {
    // A 500 asks take.app to deliver it again rather than losing the order.
    console.error("[takeapp webhook] could not store order:", error.message);
    return NextResponse.json({ error: "Could not store order" }, { status: 500 });
  }

  /* The push is what reaches an admin who has the app closed — the screen's own
     alert only fires for someone already looking at it. Awaited so the function
     is not frozen mid-send, but never allowed to fail the delivery: take.app
     would retry an order we have already stored. */
  if (!before) {
    const total = ((order.total_amount ?? 0) / 100).toFixed(2);
    const store = order.store?.name ? ` · ${order.store.name}` : "";
    try {
      await pushToAdmins({
        title: `New order #${order.number || order.name || order.id}`,
        body: `${order.currency || "AED"} ${total}${store}`,
        url: "/admin/live-orders",
        tag: `order-${order.id}`,
      });
    } catch (err) {
      console.error("[takeapp webhook] push failed:", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ received: true });
}
