export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import type { ShipdayDeliveryRow } from "@/lib/shipday";

/**
 * The delivery list admin → Shipday Delivery opens with. Updates after that
 * arrive on the SSE stream, not from here.
 *
 * Unlike Live Orders this reads one source only. Shipday's API is a supplement
 * we can do without — the webhook is what fills shipday_deliveries, and a row
 * is written the moment Shipday sends it — so the board does not depend on the
 * API key being valid.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const limit = Math.min(Math.max(Number(params.get("limit")) || 200, 1), 500);
  const status = params.get("order_status");

  let query = supabaseAdminLive
    .from("shipday_deliveries")
    .select("*")
    /* Newest first by when Shipday says the order was placed, falling back to
       when we heard about it — a delivery pushed in without a placement time
       must not sink to the bottom of the board forever. */
    .order("placement_time", { ascending: false, nullsFirst: false })
    .order("received_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("order_status", status);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: `Could not read deliveries: ${error.message}` },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const deliveries = (data ?? []) as ShipdayDeliveryRow[];

  /* Shipday knows an order only by the number it was created with, so the
     take.app side — which store, who ordered — is looked up separately and
     attached. A delivery with no match still lists; it simply shows less. */
  const numbers = Array.from(new Set(deliveries.map((d) => d.order_number).filter(Boolean)));

  let orders: Record<string, { store: string; customer: string; phone: string }> = {};
  if (numbers.length > 0) {
    const { data: matched } = await supabaseAdminLive
      .from("takeapp_orders")
      .select("number, store_name, customer_name, customer_phone")
      .in("number", numbers);

    orders = Object.fromEntries(
      ((matched ?? []) as {
        number: string;
        store_name: string;
        customer_name: string;
        customer_phone: string;
      }[]).map((o) => [o.number, { store: o.store_name, customer: o.customer_name, phone: o.customer_phone }]),
    );
  }

  return NextResponse.json(
    {
      deliveries: deliveries.map((d) => ({ ...d, takeapp: orders[d.order_number] ?? null })),
      /* The screen shows a quiet note when nothing has arrived yet, and the
         reason is nearly always that the webhook URL is not saved in Shipday. */
      configured: Boolean((process.env.SHIPDAY_WEBHOOK_TOKEN ?? "").trim()),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
