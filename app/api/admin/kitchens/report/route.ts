export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import type { OrderItem } from "@/lib/kitchen-orders";

/**
 * The kitchens page report: every order in a date range, summed up by day,
 * hour, waiter, kitchen, dish, table and payment. Used by admin → Kitchens
 * Page → Report.
 */

const BATCH = 1000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** The restaurant's own clock (Gulf Standard Time, no daylight saving). */
const OFFSET_MS = 4 * 60 * 60 * 1000;
/** Caps a range so one request cannot read the whole table forever. */
const MAX_DAYS = 366;

/* Each later SQL file adds columns; read what this database has. */
const COLUMN_SETS = [
  "id, order_number, table_code, guests, waiter_name, items, total, status, payment_method, paid_at, created_at, ready_at, served_at, discount, cash_amount, card_amount, paid_amount",
  "id, order_number, table_code, guests, waiter_name, items, total, status, payment_method, paid_at, created_at, ready_at, served_at",
  "id, order_number, table_code, guests, waiter_name, items, total, status, payment_method, paid_at, created_at",
  "id, order_number, table_code, guests, waiter_name, items, total, status, created_at",
];

interface Row {
  id: string;
  order_number: number;
  table_code: string | null;
  guests: number;
  waiter_name: string | null;
  items: OrderItem[] | null;
  total: number | string;
  status: string;
  payment_method?: string | null;
  paid_at?: string | null;
  created_at: string;
  ready_at?: string | null;
  served_at?: string | null;
  discount?: number | string | null;
  cash_amount?: number | string | null;
  card_amount?: number | string | null;
  paid_amount?: number | string | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => Number(v ?? 0) || 0;
/** The restaurant's local date and hour of an instant. */
function local(iso: string) {
  const d = new Date(new Date(iso).getTime() + OFFSET_MS);
  return { day: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}
function todayLocal() {
  return new Date(Date.now() + OFFSET_MS).toISOString().slice(0, 10);
}

interface Bucket { orders: number; sales: number; guests: number }
const bucket = (): Bucket => ({ orders: 0, sales: 0, guests: 0 });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const today = todayLocal();
  let from = params.get("from") ?? "";
  let to = params.get("to") ?? "";
  if (!DATE.test(from)) from = today;
  if (!DATE.test(to)) to = from > today ? from : today;
  if (to < from) [from, to] = [to, from];
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
  if (days > MAX_DAYS) return NextResponse.json({ error: `Pick a range of ${MAX_DAYS} days or fewer.` }, { status: 400 });

  // Find the richest column set this database supports.
  let columns = "";
  let lastError = "";
  for (const set of COLUMN_SETS) {
    const { error } = await supabaseAdminLive.from("kitchen_orders").select(set).limit(1);
    if (!error) { columns = set; break; }
    lastError = error.message;
  }
  if (!columns) return NextResponse.json({ error: lastError || "Could not read kitchen orders." }, { status: 500 });

  const rows: Row[] = [];
  for (let offset = 0; ; offset += BATCH) {
    const { data, error } = await supabaseAdminLive
      .from("kitchen_orders")
      .select(columns)
      .gte("created_at", `${from}T00:00:00+04:00`)
      .lte("created_at", `${to}T23:59:59.999+04:00`)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + BATCH - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const batch = (data ?? []) as unknown as Row[];
    rows.push(...batch);
    if (batch.length < BATCH) break;
  }

  const summary = {
    orders: 0, cancelledOrders: 0, cancelledValue: 0,
    gross: 0, discount: 0, net: 0, guests: 0, items: 0,
    paid: 0, cash: 0, card: 0, credit: 0, unpaid: 0,
    paidOrders: 0, creditOrders: 0, unpaidOrders: 0,
  };
  const status: Record<string, number> = { new: 0, preparing: 0, ready: 0, served: 0, cancelled: 0 };
  const byDay = new Map<string, Bucket>();
  const byHour = Array.from({ length: 24 }, bucket);
  const byWaiter = new Map<string, Bucket>();
  const byTable = new Map<string, Bucket>();
  const byKitchen = new Map<string, { qty: number; sales: number }>();
  const byDish = new Map<string, { name: string; kitchen: string; qty: number; sales: number }>();
  const prepTimes: number[] = [];
  const serveTimes: number[] = [];

  // Every day of the range shows, even one with no orders.
  for (let i = 0; i < days; i++) {
    byDay.set(new Date(Date.parse(from) + i * 86_400_000).toISOString().slice(0, 10), bucket());
  }

  for (const o of rows) {
    status[o.status] = (status[o.status] ?? 0) + 1;
    const gross = num(o.total);
    if (o.status === "cancelled") {
      summary.cancelledOrders++;
      summary.cancelledValue += gross;
      continue;
    }
    const discount = num(o.discount);
    const net = gross - discount;
    const guests = num(o.guests);
    summary.orders++;
    summary.gross += gross;
    summary.discount += discount;
    summary.net += net;
    summary.guests += guests;

    // Payment: what came in, by cash and card, and what is still owed.
    let cash = num(o.cash_amount);
    let card = num(o.card_amount);
    if (o.paid_at && cash + card === 0) {
      // Orders paid before split payments were recorded hold no amounts.
      if (o.payment_method === "cash") cash = net;
      else if (o.payment_method === "card") card = net;
    }
    // A paid order is settled in full; otherwise whatever part was taken counts.
    const taken = o.paid_at ? net : Math.min(net, Math.max(cash + card, num(o.paid_amount)));
    const owed = Math.max(0, net - taken);
    summary.cash += cash;
    summary.card += card;
    summary.paid += taken;
    if (o.paid_at) summary.paidOrders++;
    else if (o.payment_method === "credit") { summary.creditOrders++; summary.credit += owed; }
    else { summary.unpaidOrders++; summary.unpaid += owed; }

    const { day, hour } = local(o.created_at);
    if (!byDay.has(day)) byDay.set(day, bucket());
    for (const b of [byDay.get(day)!, byHour[hour]]) {
      b.orders++; b.sales += net; b.guests += guests;
    }
    const waiter = o.waiter_name?.trim() || "No waiter";
    if (!byWaiter.has(waiter)) byWaiter.set(waiter, bucket());
    const w = byWaiter.get(waiter)!; w.orders++; w.sales += net; w.guests += guests;
    const table = o.table_code?.trim() || "No table";
    if (!byTable.has(table)) byTable.set(table, bucket());
    const t = byTable.get(table)!; t.orders++; t.sales += net; t.guests += guests;

    for (const item of o.items ?? []) {
      const qty = num(item.qty);
      const line = num(item.line_total);
      summary.items += qty;
      const kitchen = item.kitchen?.trim() || "Other";
      const k = byKitchen.get(kitchen) ?? { qty: 0, sales: 0 };
      k.qty += qty; k.sales += line; byKitchen.set(kitchen, k);
      const key = `${item.dish_id ?? item.name}|${kitchen}`;
      const d = byDish.get(key) ?? { name: item.name, kitchen, qty: 0, sales: 0 };
      d.qty += qty; d.sales += line; byDish.set(key, d);
    }

    const placed = Date.parse(o.created_at);
    if (o.ready_at) {
      const m = (Date.parse(o.ready_at) - placed) / 60_000;
      if (m >= 0 && m < 24 * 60) prepTimes.push(m);
    }
    if (o.served_at) {
      const m = (Date.parse(o.served_at) - placed) / 60_000;
      if (m >= 0 && m < 24 * 60) serveTimes.push(m);
    }
  }

  const avg = (list: number[]) => (list.length ? r2(list.reduce((a, b) => a + b, 0) / list.length) : null);
  const median = (list: number[]) => {
    if (!list.length) return null;
    const s = [...list].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return r2(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
  };
  const rounded = (b: Bucket) => ({ orders: b.orders, sales: r2(b.sales), guests: b.guests });

  return NextResponse.json({
    from, to,
    hasTiming: columns.includes("ready_at"),
    hasSplit: columns.includes("cash_amount"),
    summary: Object.fromEntries(Object.entries(summary).map(([k, v]) => [k, r2(v)])),
    avgOrder: summary.orders ? r2(summary.net / summary.orders) : 0,
    avgPerGuest: summary.guests ? r2(summary.net / summary.guests) : 0,
    status,
    timing: {
      prepAvg: avg(prepTimes), prepMedian: median(prepTimes), prepCount: prepTimes.length,
      serveAvg: avg(serveTimes), serveMedian: median(serveTimes), serveCount: serveTimes.length,
    },
    byDay: Array.from(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, b]) => ({ day, ...rounded(b) })),
    byHour: byHour.map((b, hour) => ({ hour, ...rounded(b) })),
    byWaiter: Array.from(byWaiter).map(([name, b]) => ({ name, ...rounded(b) })).sort((a, b) => b.sales - a.sales),
    byTable: Array.from(byTable).map(([name, b]) => ({ name, ...rounded(b) })).sort((a, b) => b.sales - a.sales),
    byKitchen: Array.from(byKitchen).map(([name, k]) => ({ name, qty: k.qty, sales: r2(k.sales) })).sort((a, b) => b.sales - a.sales),
    byDish: Array.from(byDish.values()).map((d) => ({ ...d, sales: r2(d.sales) })).sort((a, b) => b.qty - a.qty || b.sales - a.sales),
  });
}
