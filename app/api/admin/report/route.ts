export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { fetchAllStoreOrders, type TakeAppOrder } from "@/lib/takeapp-orders";
import { fromOrderRow, type TakeAppOrderRow } from "@/lib/takeapp-order-row";
import { paymentMethod } from "@/lib/invoice";

/**
 * The business report behind admin → Dashboard.
 *
 * Two sources, counted once each: our own bookings — Kalba food orders, table
 * and buffet reservations, catering — and the take.app storefronts. They are
 * kept apart by name in the breakdown but summed into one set of totals,
 * because "what did the business take this week" is one question.
 *
 * Cancelled orders are excluded from money but still counted, since a
 * cancellation rate is worth seeing and a cancelled order is not revenue.
 */

interface Bucket {
  name: string;
  source: "own" | "takeapp";
  orders: number;
  revenue: number;
  cancelled: number;
}

const OWN_LABELS: Record<string, string> = {
  kalba: "University Kalba",
  table: "Table bookings",
  buffet: "Buffet",
  catering: "Catering",
};

function money(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

/** Rounded to fils so a sum of many lines cannot drift. */
function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** The local calendar day an instant falls on, as yyyy-mm-dd. */
function dayKey(iso: string, offsetMinutes: number): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  return new Date(t - offsetMinutes * 60_000).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  /* The browser's offset, so a day means the operator's day rather than UTC's.
     Sent by the caller because the server has no idea where it is running. */
  const offset = Number(params.get("tzOffset") ?? "0") || 0;

  const floor = from ? new Date(`${from}T00:00:00.000Z`).getTime() + offset * 60_000 : null;
  const cutoff = to ? new Date(`${to}T23:59:59.999Z`).getTime() + offset * 60_000 : null;

  const inRange = (iso: string) => {
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return false;
    if (floor !== null && t < floor) return false;
    if (cutoff !== null && t > cutoff) return false;
    return true;
  };

  /* Bookings are ours and cheap to read whole. take.app is asked from the
     range's start, and the stored webhook rows fill any gap the API leaves. */
  const [bookingsRes, storedRes, liveResult] = await Promise.all([
    supabaseAdminLive.from("bookings").select("*").order("created_at", { ascending: false }),
    supabaseAdminLive
      .from("takeapp_orders")
      .select("*")
      .order("order_created_at", { ascending: false })
      .limit(2000),
    fetchAllStoreOrders({
      limit: 500,
      created_after: floor !== null ? new Date(floor).toISOString() : undefined,
    }).catch(() => null),
  ]);

  const buckets = new Map<string, Bucket>();
  const byDay = new Map<string, { orders: number; revenue: number }>();
  const byPayment = new Map<string, { orders: number; revenue: number }>();

  /* What actually sold, by dish. Keyed on the name as it was ordered, because
     that is the only thing the two sources agree on — a take.app line item and
     one of ours share no id. */
  const byItem = new Map<string, { name: string; where: string; qty: number; revenue: number }>();

  function countItem(name: string, where: string, qty: number, revenue: number) {
    const clean = name.trim();
    if (!clean || qty <= 0) return;
    const key = clean.toLowerCase();
    const row = byItem.get(key) ?? { name: clean, where, qty: 0, revenue: 0 };
    row.qty += qty;
    row.revenue = round(row.revenue + revenue);
    // A dish sold at two places is named for the first one seen; the count is
    // what matters here, and the breakdown by restaurant answers the rest.
    byItem.set(key, row);
  }

  let orders = 0;
  let revenue = 0;
  let cancelled = 0;

  function count(
    when: string,
    name: string,
    source: Bucket["source"],
    amount: number,
    isCancelled: boolean,
    payment: string,
  ) {
    orders += 1;
    if (isCancelled) {
      cancelled += 1;
    } else {
      revenue = round(revenue + amount);
    }

    const key = `${source}:${name}`;
    const bucket = buckets.get(key) ?? { name, source, orders: 0, revenue: 0, cancelled: 0 };
    bucket.orders += 1;
    if (isCancelled) bucket.cancelled += 1;
    else bucket.revenue = round(bucket.revenue + amount);
    buckets.set(key, bucket);

    const day = dayKey(when, offset);
    if (day) {
      const row = byDay.get(day) ?? { orders: 0, revenue: 0 };
      row.orders += 1;
      if (!isCancelled) row.revenue = round(row.revenue + amount);
      byDay.set(day, row);
    }

    if (!isCancelled) {
      const pay = byPayment.get(payment) ?? { orders: 0, revenue: 0 };
      pay.orders += 1;
      pay.revenue = round(pay.revenue + amount);
      byPayment.set(payment, pay);
    }
  }

  // ── Our own bookings ──────────────────────────────────────────────────────
  type BookingRow = Record<string, unknown>;
  for (const row of (bookingsRes.data ?? []) as BookingRow[]) {
    const when = String(row.created_at ?? "");
    if (!inRange(when)) continue;

    const type = String(row.type ?? "table");
    /* A Kalba order carries the branch it was placed at; everything else is
       named for what it is, so the breakdown reads as places and services. */
    const name = String(row.table_section ?? "").trim() || OWN_LABELS[type] || type;
    const amount = money(row.total_amount) || money(row.min_spend);

    const isCancelled = String(row.status ?? "") === "cancelled";

    count(
      when,
      name,
      "own",
      amount,
      isCancelled,
      /* Unmarked stays its own bucket. Folding it into cash would report money
         as counted that nobody has said was taken. */
      paymentMethod(row.payment_method),
    );

    /* Itemised orders only — a table booking has no dishes, and a Kalba order
       placed before order_invoices.sql was run has them only as prose. */
    if (!isCancelled && Array.isArray(row.items)) {
      for (const entry of row.items as Record<string, unknown>[]) {
        countItem(
          String(entry?.name ?? ""),
          name,
          Math.round(money(entry?.qty)) || 1,
          money(entry?.line_total),
        );
      }
    }
  }

  // ── take.app storefronts ──────────────────────────────────────────────────
  const seen = new Set<string>();
  const takeapp: TakeAppOrder[] = [
    ...(liveResult?.orders ?? []),
    ...(storedRes.error
      ? []
      : ((storedRes.data ?? []) as TakeAppOrderRow[]).map(fromOrderRow)),
  ];

  for (const order of takeapp) {
    // The same order can arrive from both the API and a stored webhook.
    if (seen.has(order.id)) continue;
    seen.add(order.id);

    const when = order.created_at ?? "";
    if (!inRange(when)) continue;

    const where = order.store?.name || "take.app";
    const isCancelled = String(order.order_status ?? "") === "cancelled";

    count(
      when,
      where,
      "takeapp",
      // take.app counts in the smallest currency unit.
      round(money(order.total_amount) / 100),
      isCancelled,
      order.payment_status === "paid" ? "paid online" : "unpaid",
    );

    if (!isCancelled) {
      for (const line of order.line_items ?? []) {
        const qty = Math.round(money(line?.quantity)) || 1;
        countItem(String(line?.name ?? ""), where, qty, round((money(line?.price) / 100) * qty));
      }
    }
  }

  const days = Array.from(byDay.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    range: { from, to },
    totals: {
      orders,
      cancelled,
      revenue: round(revenue),
      // Over the orders that actually earned, not the cancelled ones.
      average: orders - cancelled > 0 ? round(revenue / (orders - cancelled)) : 0,
    },
    byDay: days,
    byRestaurant: Array.from(buckets.values()).sort((a, b) => b.revenue - a.revenue),
    /* Busiest first — the question is "what are people buying", so quantity
       leads and revenue is the tie-break. Capped, because a year of orders is
       a long tail nobody reads and the CSV carries the rest. */
    byItem: Array.from(byItem.values())
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 100),
    byPayment: Array.from(byPayment.entries())
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.revenue - a.revenue),
    /* Named when the API refused, so a report built from stored rows alone is
       not silently presented as complete. */
    warning: liveResult ? null : "take.app could not be reached; storefront figures may be incomplete.",
  });
}
