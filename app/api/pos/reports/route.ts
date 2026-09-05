export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { roundMoney } from "@/lib/kalba/pricing";
import { currentStaff } from "@/lib/pos/auth";
import { isPaid } from "@/lib/pos/amend";
import { deviceLabel, type KioskDevice } from "@/lib/kiosk/types";
import { TRACKING_STORES } from "@/lib/order-tracking";

/**
 * What the branch has taken over a stretch of days.
 *
 * Reads the orders rather than the closed shifts, so today counts before
 * anybody has closed anything — which is the day a manager actually wants to
 * look at.
 *
 * All three ways in, named individually. "Where it was ordered" used to say
 * "at the till" and "on the kiosk" and stop there, which was wrong twice: it
 * left the website out of a total claiming to be everything, and it lumped
 * every panel in the branch into one figure. A branch deciding whether the
 * second screen paid for itself cannot answer that from a combined number, and
 * the one by the door and the one nobody walks past are the whole question.
 *
 * Money counts the way it does on the close screens: charged, less handed back,
 * on orders where money actually arrived. A report that disagreed with the day
 * close about the same afternoon would be worse than no report at all.
 */
export async function GET(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 7));
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const sinceIso = since.toISOString();

  const [ordersRes, websiteRes, devicesRes] = await Promise.all([
    supabaseAdminLive
      .from("bookings")
      .select(
        "type, status, payment_method, total_amount, refunded_total, discount_total, items, created_at, kiosk_device_id",
      )
      .in("type", ["pos", "kiosk"])
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .limit(5000),
    /* The website half. It lives in take.app's own table, which is exactly why
       it was missing: this route only ever read bookings. */
    supabaseAdminLive
      .from("takeapp_orders")
      .select(
        "order_status, payment_status, total_amount, line_items, store_name, store_alias, order_created_at, received_at",
      )
      .or(`order_created_at.gte.${sinceIso},and(order_created_at.is.null,received_at.gte.${sinceIso})`)
      .limit(2000),
    // Panel ids to panel names, so a kiosk row can say which kiosk.
    supabaseAdminLive.from("kiosk_devices").select("id, slug, label, label_ar, location, is_active"),
  ]);

  if (ordersRes.error) {
    return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
  }

  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
    return Number.isFinite(n) ? n : 0;
  };

  const deviceNames = new Map<string, string>();
  for (const row of (devicesRes.data ?? []) as unknown as KioskDevice[]) {
    deviceNames.set(row.id, deviceLabel(row));
  }

  const byDay = new Map<string, { date: string; orders: number; sales: number }>();
  const byPayment: Record<string, number> = { cash: 0, card: 0, online: 0 };
  /** One row per named way in: the till, each panel, each storefront. */
  const bySource = new Map<string, { key: string; label: string; sales: number; orders: number }>();
  const dishes = new Map<string, { name: string; qty: number; sales: number }>();

  const addSource = (key: string, label: string, amount: number) => {
    const entry = bySource.get(key) ?? { key, label, sales: 0, orders: 0 };
    entry.sales = roundMoney(entry.sales + amount);
    entry.orders += 1;
    bySource.set(key, entry);
  };

  const addDay = (day: string, amount: number) => {
    if (!day) return;
    const bucket = byDay.get(day) ?? { date: day, orders: 0, sales: 0 };
    bucket.orders += 1;
    bucket.sales = roundMoney(bucket.sales + amount);
    byDay.set(day, bucket);
  };

  const addDish = (name: string, qty: number, value: number) => {
    const clean = name.trim();
    if (!clean) return;
    const entry = dishes.get(clean) ?? { name: clean, qty: 0, sales: 0 };
    entry.qty += qty;
    entry.sales = roundMoney(entry.sales + value);
    dishes.set(clean, entry);
  };

  let orders = 0;
  let sales = 0;
  let discounts = 0;
  let refunds = 0;

  /* ─── The counter and the panels ─── */
  for (const row of (ordersRes.data ?? []) as Record<string, unknown>[]) {
    const method = String(row.payment_method ?? "pending").toLowerCase();
    const cancelled = String(row.status ?? "").toLowerCase() === "cancelled";

    /* The same rule the close screens use. A staff meal, a credit and an
       unpaid ticket are not takings, and counting them here would have this
       page disagree with the day close about the same afternoon. */
    if (cancelled || !isPaid(method)) continue;

    const kept = roundMoney(num(row.total_amount) - num(row.refunded_total));

    orders += 1;
    sales += kept;
    discounts += num(row.discount_total);
    refunds += num(row.refunded_total);

    addDay(String(row.created_at).slice(0, 10), kept);
    byPayment[method === "cash" || method === "card" ? method : "online"] += kept;

    if (String(row.type) === "kiosk") {
      const id = row.kiosk_device_id ? String(row.kiosk_device_id) : "";
      /* Named where the panel is known, and honestly vague where it is not:
         kiosk orders taken before the panels were registered carry no device,
         and inventing a name for those is worse than saying so. */
      addSource(id ? `kiosk:${id}` : "kiosk", deviceNames.get(id) || "Kiosk (unnamed)", kept);
    } else {
      addSource("pos", "At the till", kept);
    }

    for (const item of (Array.isArray(row.items) ? row.items : []) as Record<string, unknown>[]) {
      // A line taken off the order was refunded; it did not sell.
      if (item.cancelled) continue;
      addDish(String(item.name ?? ""), Math.max(0, Math.floor(num(item.qty)) || 0), num(item.line_total));
    }
  }

  /* ─── The storefronts ─── */
  const storeName = (alias: string, fallback: string) =>
    TRACKING_STORES.find((s) => s.alias.toLowerCase() === alias.trim().toLowerCase())?.label ||
    fallback.trim() ||
    "Website";

  for (const row of (websiteRes.data ?? []) as Record<string, unknown>[]) {
    if (String(row.order_status ?? "").toLowerCase() === "cancelled") continue;
    // Paid on the storefront. An unpaid one is a basket, not a sale.
    if (String(row.payment_status ?? "").toLowerCase() !== "paid") continue;

    // take.app sends money in the smallest unit, unlike everything else here.
    const amount = roundMoney(num(row.total_amount) / 100);

    orders += 1;
    sales += amount;
    // Settled on the site, so it sits with the other card-not-present money.
    byPayment.online += amount;

    addDay(String(row.order_created_at ?? row.received_at ?? "").slice(0, 10), amount);

    const label = storeName(String(row.store_alias ?? ""), String(row.store_name ?? ""));
    addSource(`web:${label}`, `Website · ${label}`, amount);

    for (const line of (Array.isArray(row.line_items) ? row.line_items : []) as Record<string, unknown>[]) {
      addDish(
        String(line.name ?? ""),
        Math.max(1, Math.round(num(line.quantity)) || 1),
        num(line.price) / 100,
      );
    }
  }

  return NextResponse.json({
    days,
    orders,
    sales: roundMoney(sales),
    discounts: roundMoney(discounts),
    refunds: roundMoney(refunds),
    averageOrder: orders > 0 ? roundMoney(sales / orders) : 0,
    byDay: Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
    byPayment: {
      cash: roundMoney(byPayment.cash),
      card: roundMoney(byPayment.card),
      online: roundMoney(byPayment.online),
    },
    // Biggest first: the question is which way in is carrying the branch.
    bySource: Array.from(bySource.values()).sort((a, b) => b.sales - a.sales),
    topDishes: Array.from(dishes.values()).sort((a, b) => b.qty - a.qty).slice(0, 12),
  });
}
