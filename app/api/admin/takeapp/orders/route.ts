export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { fetchAllStoreOrders, type TakeAppOrder } from "@/lib/takeapp-orders";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { fromOrderRow, type TakeAppOrderRow } from "@/lib/takeapp-order-row";

/**
 * The order list admin → Live Orders opens with. Updates after that arrive on
 * the SSE stream, not from here.
 *
 * Two sources, merged: every store token is read from take.app, and
 * takeapp_orders holds whatever the webhooks have delivered. Merging means an
 * order that arrived seconds ago is on screen even if the API has not caught up
 * — and that the board still fills when a token fails outright, which is the
 * difference between a degraded screen and a blank one.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const value = (key: string) => params.get(key) ?? undefined;

  const stored = supabaseAdminLive
    .from("takeapp_orders")
    .select("*")
    .order("order_created_at", { ascending: false })
    .limit(200);

  const live = fetchAllStoreOrders({
    limit: value("limit") ? Number(value("limit")) : 100,
    order_status: value("order_status"),
    payment_status: value("payment_status"),
    fulfillment_status: value("fulfillment_status"),
    created_after: value("created_after"),
  });

  const [storedResult, liveResult] = await Promise.all([stored, live]);

  const storedOrders: TakeAppOrder[] =
    !storedResult.error
      ? ((storedResult.data ?? []) as TakeAppOrderRow[]).map(fromOrderRow)
      : [];

  const seen = new Set(liveResult.orders.map((o) => String(o.id)));
  const merged = [
    ...liveResult.orders,
    ...storedOrders.filter((o) => !seen.has(String(o.id))),
  ].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  /* Warnings, not an error: one store's token failing must not blank out the
     other three. Only when nothing at all came back is it worth a red panel. */
  const warning = liveResult.warnings.join(" · ");
  const nothingWorked = merged.length === 0 && liveResult.warnings.length > 0;

  return NextResponse.json(
    {
      orders: merged,
      hasMore: false,
      nextCursor: null,
      stores: Array.from(new Set(merged.map((o) => o.store?.name).filter(Boolean))),
      ...(warning ? { warning, ...(nothingWorked ? { error: warning } : {}) } : {}),
    },
    {
      status: nothingWorked ? 502 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
