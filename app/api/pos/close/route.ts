export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { roundMoney } from "@/lib/kalba/pricing";
import { currentStaff } from "@/lib/pos/auth";
import { openShiftFor } from "@/lib/pos/shift-server";
import { cleanCounts, countTotal } from "@/lib/pos/shift";
import { getPosSettings } from "@/lib/pos/menu-server";
import { shiftTakings, whatsappSummary } from "@/lib/pos/reconcile";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { can } from "@/lib/pos/permissions";
import { businessDateFor } from "@/lib/pos/business-day";
import { isPaid } from "@/lib/pos/amend";

/**
 * Closing one shift. The restaurant's day is closed at /api/pos/day.
 *
 * GET works the shift out without changing anything, so the screen can show the
 * reconciliation while the drawer is still being counted. POST is the act of
 * signing it off: it freezes those figures onto the shift row and shuts it.
 *
 * Those frozen figures are what the day close later adds up, which is why they
 * are written here and never recomputed — a refund tomorrow must not move a
 * daily total that has already been reported.
 */

export async function GET() {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const shift = await openShiftFor(staff.id);
  if (!shift) return NextResponse.json({ error: "No shift is open" }, { status: 409 });

  const [takings, settings, expensesRes, contributions] = await Promise.all([
    shiftTakings(shift.id, Number(shift.opening_float)),
    getPosSettings(),
    supabaseAdminLive.from("pos_expenses").select("*").eq("shift_id", shift.id).order("spent_at"),
    dailyContributions(),
  ]);

  return NextResponse.json({
    staff,
    shift,
    takings,
    settings,
    expenses: expensesRes.data ?? [],
    contributions,
    businessDate: businessDateFor(),
  });
}

/**
 * Who sold what today, across every shift on the trading day.
 *
 * Counted from the orders rather than from the shift rows, because the shift
 * being closed has not frozen its figures yet — reading those would show the
 * person doing the closing as having sold nothing, which is the one row they
 * are certain to check.
 *
 * Grouped by the member of staff on the order, not by shift: somebody who
 * worked a morning and came back for the evening is one person on this table,
 * which is what "employee contribution" means to whoever reads it.
 */
async function dailyContributions() {
  const date = businessDateFor();

  const { data: shiftRows, error: shiftError } = await supabaseAdminLive
    .from("pos_shifts")
    .select("id, shift_label, staff_uuid, pos_staff!pos_shifts_staff_uuid_fkey(name, staff_id)")
    .eq("business_date", date);

  if (shiftError || !shiftRows || shiftRows.length === 0) return [];

  const shifts = shiftRows as unknown as {
    id: string;
    shift_label: string;
    staff_uuid: string;
    pos_staff: { name: string; staff_id: string } | null;
  }[];

  const { data: orderRows } = await supabaseAdminLive
    .from("bookings")
    .select("status, payment_method, total_amount, refunded_total, pos_shift_id")
    .in("pos_shift_id", shifts.map((s) => s.id));

  const byShift = new Map(shifts.map((s) => [s.id, s]));
  const tally = new Map<string, { name: string; shifts: Set<string>; orders: number; net: number }>();

  for (const row of (orderRows ?? []) as Record<string, unknown>[]) {
    const shift = byShift.get(String(row.pos_shift_id));
    if (!shift) continue;

    const method = String(row.payment_method ?? "pending").toLowerCase();
    const cancelled = String(row.status ?? "").toLowerCase() === "cancelled";
    // The same rule the shift figures use: only money that actually arrived.
    if (cancelled || !isPaid(method) || method === "staff_food") continue;

    const key = shift.staff_uuid;
    const name = shift.pos_staff?.name || shift.pos_staff?.staff_id || "Unknown";
    const entry = tally.get(key) ?? { name, shifts: new Set<string>(), orders: 0, net: 0 };
    entry.shifts.add(shift.shift_label);
    entry.orders += 1;
    entry.net += (Number(row.total_amount) || 0) - (Number(row.refunded_total) || 0);
    tally.set(key, entry);
  }

  const rows = Array.from(tally.values()).map((e) => ({
    name: e.name,
    shift: Array.from(e.shifts).join(", "),
    orders: e.orders,
    net: Math.round(e.net * 100) / 100,
  }));

  // Biggest first: the question this table answers is who is selling.
  rows.sort((a, b) => b.net - a.net);
  return rows;
}

export async function POST(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  /* Closing your own drawer is the cashier's own job — it is a handover, not a
     sign-off, and requiring a manager for it is what made the old combined
     screen unusable at four in the afternoon. It is still a permission rather
     than a free-for-all: a new starter counts the drawer and someone else ends
     the shift. The check lives here because a hidden button is not a control. */
  if (!can(staff, "shift_close")) {
    return NextResponse.json(
      { error: "You are not set up to close a shift. Ask a manager or supervisor." },
      { status: 403 },
    );
  }

  const shift = await openShiftFor(staff.id);
  if (!shift) return NextResponse.json({ error: "No shift is open" }, { status: 409 });

  const body = await request.json().catch(() => ({}));
  const counts = cleanCounts(body?.counts);
  const countedCash = countTotal(counts);

  const [takings, settings, heroRes] = await Promise.all([
    shiftTakings(shift.id, Number(shift.opening_float)),
    getPosSettings(),
    supabaseAdmin.from("kalba_hero").select("name").limit(1).maybeSingle(),
  ]);

  const difference = roundMoney(countedCash - takings.expectedCash);
  const closedAt = new Date().toISOString();

  const { error } = await supabaseAdminLive
    .from("pos_shifts")
    .update({
      status: "closed",
      closed_at: closedAt,
      closed_by: staff.id,
      closing_counts: counts,
      closing_cash: countedCash,
      expected_cash: takings.expectedCash,
      difference,
      /* The declaration rides in the closing note. A drawer signed off at
         nothing on a shift that took AED 800 on card is a different fact from
         one on a shift that took nothing at all, and next month nobody will
         remember which — so the row says so in its own words. */
      closing_note: [
        String(body?.note ?? "").trim(),
        body?.zeroSales ? "Declared: no sales this shift." : "",
        body?.zeroCash ? "Declared: no cash received this shift." : "",
      ]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 500),
      // Uploaded separately, so a failed photo never costs a counted drawer.
      close_photo_url: String(body?.photoUrl ?? "").trim().slice(0, 500),
      /* Frozen here rather than recomputed later. The orders can still be
         refunded or amended afterwards; what was signed off must not move. */
      gross_sales: takings.grossSales,
      discount_total: takings.discountTotal,
      refund_total: takings.refundTotal,
      vat_total: takings.vatTotal,
      net_sales: takings.netSales,
      cash_sales: takings.cashSales,
      card_sales: takings.cardSales,
      online_sales: takings.onlineSales,
      expense_total: takings.expenseTotal,
      order_count: takings.orderCount,
      /* Frozen here too, or the day close — which sums the shifts rather than
         recounting the orders — would report a day's refunds and staff meals
         as zero while every shift on it showed its own correctly. */
      cancelled_total: takings.cancelledTotal,
      staff_food_total: takings.staffFoodTotal,
      credit_total: takings.creditTotal,
      pending_total: takings.pendingTotal,
      updated_at: closedAt,
    })
    .eq("id", shift.id)
    // Guards against two tablets closing the same shift at once.
    .eq("status", "open");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  /* Anything the cashier put down and never rang up dies with the shift.
     A parked basket surviving into tomorrow is a stale price and a customer
     who left hours ago. */
  await supabaseAdminLive.from("pos_parked_orders").delete().eq("shift_id", shift.id);

  const summary = whatsappSummary({
    branch: heroRes.data?.name?.trim() || "Two in One",
    staffName: staff.name || staff.staff_id,
    shiftLabel: shift.shift_label,
    openedAt: shift.opened_at,
    closedAt,
    takings,
    countedCash,
    difference,
  });

  return NextResponse.json({
    ok: true,
    takings,
    countedCash,
    difference,
    summary,
    /* The link is handed back rather than opened here: sending is the phone's
       job, and a server that "sends WhatsApp" without an API behind it would
       be a promise the till cannot keep. */
    whatsappUrl: settings.whatsapp_report_to
      ? `https://wa.me/${settings.whatsapp_report_to.replace(/[^\d]/g, "")}?text=${encodeURIComponent(summary)}`
      : "",
  });
}
