export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { roundMoney } from "@/lib/kalba/pricing";
import { currentStaff } from "@/lib/pos/auth";

/**
 * What the branch has taken over a stretch of days.
 *
 * Reads the orders rather than the closed shifts, so today counts before
 * anybody has closed anything — which is the day a manager actually wants to
 * look at. Till and kiosk together, split out so either can be read alone.
 */
export async function GET(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 7));
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const { data, error } = await supabaseAdminLive
    .from("bookings")
    .select("type, status, payment_method, total_amount, discount_total, items, created_at")
    .in("type", ["pos", "kiosk"])
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
    return Number.isFinite(n) ? n : 0;
  };

  const byDay = new Map<string, { date: string; orders: number; sales: number }>();
  const byPayment: Record<string, number> = { cash: 0, card: 0, online: 0 };
  const bySource: Record<string, number> = { pos: 0, kiosk: 0 };
  const dishes = new Map<string, { name: string; qty: number; sales: number }>();

  let orders = 0;
  let sales = 0;
  let discounts = 0;
  let refunds = 0;

  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const total = num(row.total_amount);

    if (String(row.status ?? "").toLowerCase() === "cancelled") {
      refunds += total;
      continue;
    }

    orders += 1;
    sales += total;
    discounts += num(row.discount_total);

    const day = String(row.created_at).slice(0, 10);
    const bucket = byDay.get(day) ?? { date: day, orders: 0, sales: 0 };
    bucket.orders += 1;
    bucket.sales = roundMoney(bucket.sales + total);
    byDay.set(day, bucket);

    const method = String(row.payment_method ?? "");
    byPayment[method === "cash" || method === "card" ? method : "online"] += total;
    bySource[String(row.type)] = (bySource[String(row.type)] ?? 0) + total;

    for (const item of (Array.isArray(row.items) ? row.items : []) as Record<string, unknown>[]) {
      const name = String(item.name ?? "").trim();
      if (!name) continue;
      const entry = dishes.get(name) ?? { name, qty: 0, sales: 0 };
      entry.qty += Math.max(0, Math.floor(num(item.qty)) || 0);
      entry.sales = roundMoney(entry.sales + num(item.line_total));
      dishes.set(name, entry);
    }
  }

  return NextResponse.json({
    days,
    orders,
    sales: roundMoney(sales),
    discounts: roundMoney(discounts),
    refunds: roundMoney(refunds),
    averageOrder: orders > 0 ? roundMoney(sales / orders) : 0,
    byDay: Array.from(byDay.values()),
    byPayment: {
      cash: roundMoney(byPayment.cash),
      card: roundMoney(byPayment.card),
      online: roundMoney(byPayment.online),
    },
    bySource: { pos: roundMoney(bySource.pos ?? 0), kiosk: roundMoney(bySource.kiosk ?? 0) },
    topDishes: Array.from(dishes.values()).sort((a, b) => b.qty - a.qty).slice(0, 12),
  });
}
