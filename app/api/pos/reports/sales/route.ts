export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { roundMoney } from "@/lib/kalba/pricing";
import { currentStaff } from "@/lib/pos/auth";
import { can } from "@/lib/pos/permissions";
import { isPaid } from "@/lib/pos/amend";
import { businessDateFor, businessDayRange } from "@/lib/pos/business-day";

/**
 * The sales performance report: who sold what, over which days.
 *
 * Read from the orders rather than from closed shifts, so today counts before
 * anybody has closed anything — which is the day a manager most often wants to
 * look at. Every figure is worked out here rather than in the browser: the
 * screen sends a date range and a filter and gets numbers back, so two people
 * on two tablets cannot arrive at two different answers for the same week.
 *
 * "Net sales" means the same thing it means on the close screens — what was
 * charged, less what was handed back, on orders where money actually arrived.
 * Staff meals, credit and unpaid tickets are not sales and are not counted.
 */

interface Line {
  name?: string;
  qty?: number;
  line_total?: number;
  cancelled?: boolean;
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

/** yyyy-mm-dd, or null for anything that is not one. */
function asDate(value: string | null): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function GET(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(staff, "reports")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;

  const defaultFrom = businessDateFor();

  const from = asDate(params.get("from")) ?? defaultFrom;
  const to = asDate(params.get("to")) ?? defaultFrom;

  /*
   * The window, in trading days rather than calendar days.
   *
   * It used to be `${from}T00:00:00` to the next midnight, which is three
   * separate mistakes stacked: a bare timestamp is read as UTC, UTC midnight is
   * 4am in Dubai, and the branch's own day turns over at 5am anyway. A report
   * for a day covered the five hours before it and lost its own last five —
   * which on a branch that trades past midnight is most of an evening shift.
   * Fifty-nine orders read back as two.
   *
   * businessDayRange gives the same boundaries the shift and day closes use, so
   * a cashier's sales report and their close now describe the same hours.
   */
  const { start, end } = businessDayRange(from, to);

  const source = (params.get("source") ?? "all").toLowerCase();
  const staffFilter = params.get("staff") ?? "";

  /* Which booking types the source filter covers. Website orders live in
     take.app's own table and are handled separately below. */
  const types = source === "kiosk" ? ["kiosk"] : source === "pos" ? ["pos"] : ["pos", "kiosk"];

  let query = supabaseAdminLive
    .from("bookings")
    .select(
      "id, type, status, payment_method, total_amount, discount_total, refunded_total, items, created_at, pos_staff_uuid",
    )
    .in("type", types)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: true })
    .limit(5000);

  /* A waiter's report is their own work, the same way their board is. Anyone
     asking about somebody else has to be allowed to see everybody. */
  const restricted = can(staff, "own_orders_only");
  if (restricted) query = query.eq("pos_staff_uuid", staff.id);
  else if (staffFilter) query = query.eq("pos_staff_uuid", staffFilter);

  const [ordersRes, catalogue, staffRes] = await Promise.all([
    query,
    /* Item name → category, because a booking's item lines carry a name and a
       price and nothing else. Read whole and indexed in memory: it is a few
       hundred rows against potentially thousands of order lines. */
    itemCategories(),
    supabaseAdminLive
      .from("pos_staff")
      .select("id, name, staff_id")
      .eq("is_active", true)
      .order("name"),
  ]);

  if (ordersRes.error) {
    return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
  }

  const rows = (ordersRes.data ?? []) as Record<string, unknown>[];

  const items = new Map<
    string,
    { name: string; category: string; qty: number; orders: number; gross: number; discounts: number; refunds: number }
  >();
  const byDay = new Map<
    string,
    { date: string; orders: number; items: number; net: number; discounts: number; refunds: number }
  >();
  const byCategory = new Map<string, { category: string; qty: number; net: number }>();

  let orders = 0;
  let itemsSold = 0;
  let gross = 0;
  let discounts = 0;
  let refunds = 0;

  for (const row of rows) {
    const method = String(row.payment_method ?? "pending").toLowerCase();
    const cancelled = String(row.status ?? "").toLowerCase() === "cancelled";

    /* The same rule the close screens use. isPaid means money actually changed
       hands, so a staff meal, a credit and an unpaid ticket are all excluded —
       none of them are performance, and counting them would flatter every
       figure on this page. */
    if (cancelled || !isPaid(method)) continue;

    const total = num(row.total_amount);
    const refunded = num(row.refunded_total);
    const discount = num(row.discount_total);
    /* The trading day, not the UTC date on the timestamp. Slicing the ISO
       string put an order rung up at 1am into the day before it was sold in,
       and split one evening shift across two rows of the daily breakdown. */
    const day = businessDateFor(new Date(String(row.created_at)));

    orders += 1;
    gross += total + discount;
    discounts += discount;
    refunds += refunded;

    const lines = (Array.isArray(row.items) ? row.items : []) as Line[];
    let dayItems = 0;

    /*
     * What this order's discount is worth to each dish on it.
     *
     * The discount is stored once, against the order — the lines carry no share
     * of it. So the item table's Discounts column was never written to and its
     * Refunds column never written to either: both were initialised to zero,
     * carried through the arithmetic as zero, and printed as AED 0.00 on every
     * row of every report ever run, whatever had actually been given away. Net
     * was therefore always equal to gross, which overstated every dish by its
     * share of the discount.
     *
     * Split by what each line is worth, with the last line taking the rounding
     * remainder so the shares add back to the discount exactly rather than
     * leaving a stray fil to turn up in a total.
     */
    const live = lines.filter((l) => !l.cancelled && String(l.name ?? "").trim());
    const liveValue = live.reduce((sum, l) => sum + num(l.line_total), 0);
    const shares = new Map<Line, number>();
    if (discount > 0 && liveValue > 0) {
      let handedOut = 0;
      live.forEach((line, i) => {
        const share =
          i === live.length - 1
            ? roundMoney(discount - handedOut)
            : roundMoney((discount * num(line.line_total)) / liveValue);
        handedOut = roundMoney(handedOut + share);
        shares.set(line, share);
      });
    }

    for (const line of lines) {
      const name = String(line.name ?? "").trim();
      if (!name) continue;

      const value = num(line.line_total);
      const category = catalogue.get(name.toLowerCase()) ?? "Uncategorised";

      const entry = items.get(name) ?? {
        name,
        category,
        qty: 0,
        orders: 0,
        gross: 0,
        discounts: 0,
        refunds: 0,
      };

      /* A line taken off a paid order did not sell — but it was charged for and
         handed back, and a dish being refunded over and over is the single most
         useful thing this table can tell a manager. It used to be skipped
         outright, so a dish nobody could keep down looked like a dish nobody
         ordered. Counted into gross and straight back out as a refund, never
         into quantity sold. */
      if (line.cancelled) {
        entry.gross += value;
        entry.refunds += value;
        items.set(name, entry);
        continue;
      }

      const qty = Math.max(0, Math.floor(num(line.qty)) || 0);
      const share = shares.get(line) ?? 0;

      itemsSold += qty;
      dayItems += qty;

      entry.qty += qty;
      entry.orders += 1;
      // Gross is what the dish was worth before the order's discount came off.
      entry.gross += value + share;
      entry.discounts += share;
      items.set(name, entry);

      const cat = byCategory.get(category) ?? { category, qty: 0, net: 0 };
      cat.qty += qty;
      // Categories carry net, so the discount is already off.
      cat.net += value;
      byCategory.set(category, cat);
    }

    const bucket = byDay.get(day) ?? { date: day, orders: 0, items: 0, net: 0, discounts: 0, refunds: 0 };
    bucket.orders += 1;
    bucket.items += dayItems;
    bucket.net += total - refunded;
    bucket.discounts += discount;
    bucket.refunds += refunded;
    byDay.set(day, bucket);
  }

  const net = roundMoney(gross - discounts - refunds);

  /* net = gross − discounts − refunds is a real subtraction now rather than a
     subtraction of two zeroes: gross is the dish at menu value, discounts is
     what came off it, refunds is what went back, and net is what the branch
     charged and kept for it.

     It is not expected to equal the net in the header, and never was. The
     header counts whole orders, which carry a delivery charge that is nobody's
     dish; this table counts dishes. Its own Total row is the one that adds up. */
  const itemRows = Array.from(items.values())
    .map((i) => ({
      ...i,
      gross: roundMoney(i.gross),
      discounts: roundMoney(i.discounts),
      refunds: roundMoney(i.refunds),
      net: roundMoney(i.gross - i.discounts - i.refunds),
    }))
    .sort((a, b) => b.net - a.net);

  /* What the branch took over the same window, whoever sold it — the
     denominator behind "this person is 32.6% of sales". Skipped when the
     report is already the whole branch, since it would be the same query. */
  let branchNet = net;
  if (staffFilter && !restricted) {
    branchNet = await branchTotal(start.toISOString(), end.toISOString(), types);
  }

  const days = Array.from(byDay.values()).map((d) => ({
    ...d,
    net: roundMoney(d.net),
    discounts: roundMoney(d.discounts),
    refunds: roundMoney(d.refunds),
    averageOrder: d.orders > 0 ? roundMoney(d.net / d.orders) : 0,
  }));

  const bestDay = days.reduce<(typeof days)[number] | null>(
    (best, d) => (!best || d.net > best.net ? d : best),
    null,
  );

  return NextResponse.json({
    from,
    to,
    source,
    staff: staffFilter,
    restricted,
    totals: {
      net,
      gross: roundMoney(gross),
      discounts: roundMoney(discounts),
      refunds: roundMoney(refunds),
      orders,
      itemsSold,
      averageOrder: orders > 0 ? roundMoney(net / orders) : 0,
      /* Share of everything the branch took in the window. 100% when nobody is
         filtered, which is honest rather than meaningless — it is the whole. */
      contribution: branchNet > 0 ? Math.round((net / branchNet) * 1000) / 10 : 0,
    },
    items: itemRows,
    byDay: days,
    byCategory: Array.from(byCategory.values())
      .map((c) => ({ ...c, net: roundMoney(c.net) }))
      .sort((a, b) => b.net - a.net),
    highlights: {
      topSelling: itemRows.slice().sort((a, b) => b.qty - a.qty)[0]?.name ?? "",
      topEarning: itemRows[0]?.name ?? "",
      bestDay: bestDay?.date ?? "",
      bestDayNet: bestDay?.net ?? 0,
    },
    employees: (staffRes.data ?? []) as { id: string; name: string; staff_id: string }[],
  });
}

/** Dish name → category label, lowercased for matching against stored lines. */
async function itemCategories(): Promise<Map<string, string>> {
  const [itemsRes, catsRes] = await Promise.all([
    supabaseAdminLive.from("kalba_popular_items").select("name, category_id"),
    supabaseAdminLive.from("kalba_categories").select("id, label"),
  ]);

  const labels = new Map(
    ((catsRes.data ?? []) as { id: string; label: string }[]).map((c) => [c.id, c.label]),
  );

  const out = new Map<string, string>();
  for (const row of (itemsRes.data ?? []) as { name: string; category_id: string | null }[]) {
    const name = String(row.name ?? "").trim().toLowerCase();
    if (!name) continue;
    out.set(name, (row.category_id && labels.get(row.category_id)) || "Uncategorised");
  }
  return out;
}

/** Everything the branch took in the window, for the contribution share. */
async function branchTotal(startIso: string, endIso: string, types: string[]): Promise<number> {
  const { data } = await supabaseAdminLive
    .from("bookings")
    .select("status, payment_method, total_amount, refunded_total")
    .in("type", types)
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .limit(5000);

  let total = 0;
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const method = String(row.payment_method ?? "pending").toLowerCase();
    if (String(row.status ?? "").toLowerCase() === "cancelled") continue;
    if (!isPaid(method)) continue;
    total += num(row.total_amount) - num(row.refunded_total);
  }
  return roundMoney(total);
}
