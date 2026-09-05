export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseAdminLive } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
import { can } from "@/lib/pos/permissions";
import { getPosSettings } from "@/lib/pos/menu-server";
import {
  businessDateFor,
  businessDateLabel,
  dayReport,
  sumShifts,
} from "@/lib/pos/business-day";
import { shiftsForBusinessDay } from "@/lib/pos/shift-server";

/**
 * Closing the business day — which is not closing a shift.
 *
 * A shift close is one person and one drawer: count it, hand it over, go home,
 * and the restaurant keeps trading under whoever comes on next. A day close is
 * the restaurant: every shift closed, every drawer counted, the combined
 * figures signed off once by a manager and reported.
 *
 * The day's totals are summed from the shifts rather than recounted from the
 * orders. Both ways would give the same answer today, and only one of them
 * still gives the right answer after a refund next week — the shift rows were
 * frozen at their own close, so the morning's takings keep the value they were
 * signed off at instead of quietly changing under a daily total that has
 * already been sent to management. It is also why sales from two shifts appear
 * exactly once in the day: each shift contributes its own frozen figures.
 */

/** The day being worked on: whatever was asked for, or the one we are in. */
function requestedDate(request: Request): string {
  const asked = new URL(request.url).searchParams.get("date") ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : businessDateFor();
}

export async function GET(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(staff, "day_close")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const date = requestedDate(request);

  const [shifts, closedRes, pendingRes] = await Promise.all([
    shiftsForBusinessDay(date),
    supabaseAdminLive
      .from("pos_business_days")
      .select("*")
      .eq("business_date", date)
      .maybeSingle(),
    /* Days before this one that were traded and never signed off. A branch
       that forgets on a Friday should be told on the Saturday rather than
       discovering it a month later with the shifts long closed. */
    supabaseAdminLive
      .from("pos_shifts")
      .select("business_date")
      .lt("business_date", date)
      .not("business_date", "is", null)
      .order("business_date", { ascending: false })
      .limit(400),
  ]);

  const earlier = new Set(
    ((pendingRes.data ?? []) as { business_date: string }[]).map((r) => r.business_date),
  );
  let missed: string[] = [];
  if (earlier.size > 0) {
    const { data } = await supabaseAdminLive
      .from("pos_business_days")
      .select("business_date")
      .in("business_date", Array.from(earlier));
    for (const row of (data ?? []) as { business_date: string }[]) {
      earlier.delete(row.business_date);
    }
    // Most recent first, and only a few — this is a nudge, not a backlog screen.
    missed = Array.from(earlier).sort().reverse().slice(0, 5);
  }

  return NextResponse.json({
    date,
    label: businessDateLabel(date),
    shifts,
    totals: sumShifts(shifts),
    openShifts: shifts.filter((s) => s.status === "open"),
    closedDay: closedRes.data ?? null,
    missed,
  });
}

/**
 * Reopening a day that was closed by mistake.
 *
 * The shift-open error has always told people "a manager has to reopen it
 * before a new shift can start", and until now there was nothing that could —
 * so a day closed at eleven in the morning locked the branch out of its own
 * till until five the next morning. A promise the software could not keep.
 *
 * It deletes the sign-off rather than flagging it, because a reopened day is
 * going to be closed again and the second close is the one that counts. The
 * shifts underneath are untouched; their figures were frozen at their own
 * close and are what the new sign-off will sum again.
 */
export async function DELETE(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(staff, "day_close")) {
    return NextResponse.json(
      { error: "Reopening a business day needs a manager." },
      { status: 403 },
    );
  }

  const date = requestedDate(request);

  const { error } = await supabaseAdminLive
    .from("pos_business_days")
    .delete()
    .eq("business_date", date);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, date });
}

export async function POST(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  /* The button was already hidden from anyone without this, but a hidden button
     is not a control — the check has to be where the write happens. */
  if (!can(staff, "day_close")) {
    return NextResponse.json(
      { error: "Closing the business day needs a manager. Ask one to sign in." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.date ?? ""))
    ? String(body.date)
    : businessDateFor();

  const shifts = await shiftsForBusinessDay(date);

  /*
   * A day with no shifts on it can still be closed.
   *
   * It used to be refused, on the reasoning that there was nothing to sign off.
   * That is true of the money and false of the day: a branch that opened, took
   * nothing and shut still has a manager who wants the day signed and the
   * report filed saying so, and a public holiday nobody worked is exactly the
   * day you want a record of. Refusing left those days open forever, and an
   * open day is what the unclosed-day warning keeps shouting about.
   *
   * The one thing still refused is a shift somebody is standing at, below.
   */

  /* An open shift is a drawer nobody has counted. Leaving it out would produce
     a daily total that is short by exactly one cashier's takings and looks
     perfectly plausible; including it would mix uncounted cash into a figure
     somebody signs their name to. So neither — the day waits. */
  const open = shifts.filter((s) => s.status === "open");
  if (open.length > 0) {
    return NextResponse.json(
      {
        error:
          open.length === 1
            ? `${open[0].staff_name} still has a shift open. It has to be closed before the day can be.`
            : `${open.length} shifts are still open. They have to be closed before the day can be.`,
        openShifts: open,
      },
      { status: 409 },
    );
  }

  const totals = sumShifts(shifts);

  const [settings, heroRes] = await Promise.all([
    getPosSettings(),
    supabaseAdmin.from("kalba_hero").select("name").limit(1).maybeSingle(),
  ]);

  const branch = heroRes.data?.name?.trim() || "Two in One";
  const report = dayReport({
    branch,
    date,
    managerName: staff.name || staff.staff_id,
    totals,
    shifts,
  });

  const { error } = await supabaseAdminLive.from("pos_business_days").insert([
    {
      business_date: date,
      status: "closed",
      closed_by: staff.id,
      shift_count: totals.shiftCount,
      order_count: totals.orderCount,
      gross_sales: totals.grossSales,
      discount_total: totals.discountTotal,
      refund_total: totals.refundTotal,
      vat_total: totals.vatTotal,
      net_sales: totals.netSales,
      cash_sales: totals.cashSales,
      card_sales: totals.cardSales,
      online_sales: totals.onlineSales,
      expense_total: totals.expenseTotal,
      expected_cash: totals.expectedCash,
      counted_cash: totals.countedCash,
      difference: totals.difference,
      note: String(body?.note ?? "").trim().slice(0, 500),
      report,
    },
  ]);

  if (error) {
    /* The unique index on business_date is the lock. Two managers closing at
       once means one of them wins and the other is told the day is already
       signed off — rather than two daily totals for the same date. */
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `${businessDateLabel(date)} has already been closed off.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    date,
    totals,
    report,
    whatsappUrl: settings.whatsapp_report_to
      ? `https://wa.me/${settings.whatsapp_report_to.replace(/[^\d]/g, "")}?text=${encodeURIComponent(report)}`
      : "",
  });
}
