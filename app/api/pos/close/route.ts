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

/**
 * Closing the day.
 *
 * GET works the shift out without changing anything, so the screen can show the
 * reconciliation while the drawer is still being counted. POST is the act of
 * signing it off: it freezes those figures onto the shift row and shuts it.
 */

export async function GET() {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const shift = await openShiftFor(staff.id);
  if (!shift) return NextResponse.json({ error: "No shift is open" }, { status: 409 });

  const [takings, settings, expensesRes] = await Promise.all([
    shiftTakings(shift.id, Number(shift.opening_float)),
    getPosSettings(),
    supabaseAdminLive.from("pos_expenses").select("*").eq("shift_id", shift.id).order("spent_at"),
  ]);

  return NextResponse.json({
    staff,
    shift,
    takings,
    settings,
    expenses: expensesRes.data ?? [],
  });
}

export async function POST(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  /* Signing the day off is a manager's act, as the screen says it is. The
     button was already hidden from a cashier, but a hidden button is not a
     control — the check has to be here, where the write happens. A cashier can
     still count the drawer and read the reconciliation; what they cannot do is
     close the figures somebody else has to answer for. */
  if (staff.role !== "manager") {
    return NextResponse.json(
      { error: "A manager has to close the day. Ask one to sign in." },
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
      closing_note: String(body?.note ?? "").trim().slice(0, 500),
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
