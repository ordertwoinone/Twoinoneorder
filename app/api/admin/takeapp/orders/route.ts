export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { fetchOrders, TakeAppError, type TakeAppOrder } from "@/lib/takeapp-orders";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { fromOrderRow, type TakeAppOrderRow } from "@/lib/takeapp-order-row";

/**
 * The order list admin → Live Orders opens with. Updates after that arrive on
 * the SSE stream, not from here.
 *
 * Two sources, merged: the merchant API is the truth, and takeapp_orders holds
 * whatever the webhook has delivered. Merging means an order that arrived
 * seconds ago is on screen even if the API has not caught up — and that the
 * board still fills when the API call fails outright, which is the difference
 * between a degraded screen and a blank one.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const value = (key: string) => params.get(key) ?? undefined;

  const stored = supabaseAdminLive
    .from("takeapp_orders")
    .select("*")
    .order("order_created_at", { ascending: false })
    .limit(100);

  const live = fetchOrders({
    limit: value("limit") ? Number(value("limit")) : 100,
    order_status: value("order_status"),
    payment_status: value("payment_status"),
    fulfillment_status: value("fulfillment_status"),
    created_after: value("created_after"),
    cursor: value("cursor"),
  });

  const [storedResult, liveResult] = await Promise.allSettled([stored, live]);

  const storedOrders: TakeAppOrder[] =
    storedResult.status === "fulfilled" && !storedResult.value.error
      ? ((storedResult.value.data ?? []) as TakeAppOrderRow[]).map(fromOrderRow)
      : [];

  if (liveResult.status === "rejected") {
    const err = liveResult.reason;
    const status = err instanceof TakeAppError ? err.status : 502;
    const message = err instanceof Error ? err.message : "Could not load orders.";

    // Stored orders are better than nothing, so they go out with the warning
    // rather than the request failing outright.
    return NextResponse.json(
      // `error` as well as `warning`: with stored orders this is a warning
      // beside a working board, without them it is the whole story.
      { orders: storedOrders, hasMore: false, nextCursor: null, warning: message, error: message },
      { status: storedOrders.length > 0 ? 200 : status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const page = liveResult.value;
  const seen = new Set(page.orders.map((o) => String(o.id)));
  const merged = [
    ...page.orders,
    ...storedOrders.filter((o) => !seen.has(String(o.id))),
  ].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  return NextResponse.json(
    { ...page, orders: merged },
    { headers: { "Cache-Control": "no-store" } },
  );
}
