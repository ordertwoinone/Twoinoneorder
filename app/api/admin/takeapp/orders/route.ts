export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { fetchOrders, TakeAppError } from "@/lib/takeapp-orders";

/**
 * Proxy for the take.app order feed.
 *
 * The screen polls this every 30 seconds; the key stays here, and middleware
 * keeps the route behind the admin session like the rest of /api/admin.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const value = (key: string) => params.get(key) ?? undefined;

  try {
    const page = await fetchOrders({
      limit: value("limit") ? Number(value("limit")) : 100,
      order_status: value("order_status"),
      payment_status: value("payment_status"),
      fulfillment_status: value("fulfillment_status"),
      created_after: value("created_after"),
      cursor: value("cursor"),
    });

    return NextResponse.json(page, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const status = err instanceof TakeAppError ? err.status : 502;
    const message = err instanceof Error ? err.message : "Could not load orders.";
    return NextResponse.json({ error: message }, { status });
  }
}
