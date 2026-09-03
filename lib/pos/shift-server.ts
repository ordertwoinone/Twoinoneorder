import { supabaseAdminLive } from "@/lib/supabase-admin";
import type { PosShift, StaleShift } from "@/lib/pos/shift";
import { memo, TTL } from "@/lib/pos/cache";
import { businessDateFor, type DayShift } from "@/lib/pos/business-day";

/**
 * Reading shifts from the server.
 *
 * Split from lib/pos/shift.ts so the arithmetic there stays importable by the
 * till screens; this half holds the service-role key and must never be reached
 * from a client component.
 */

/** The shift this member of staff has open, or null if they have not started. */
export async function openShiftFor(staffUuid: string): Promise<PosShift | null> {
  const { data, error } = await supabaseAdminLive
    .from("pos_shifts")
    .select("*")
    .eq("staff_uuid", staffUuid)
    .eq("status", "open")
    .maybeSingle();

  if (error || !data) return null;
  return data as PosShift;
}

/**
 * Shifts left open from a previous day.
 *
 * A day that was never closed is a drawer nobody counted and takings nobody
 * signed for, and the longer it sits the less anyone can reconstruct. Nothing
 * here closes it — a shift can only be signed off by someone who has counted
 * the money — but every till screen carries the warning until one is.
 *
 * Branch-wide rather than per-cashier on purpose: the person who left it open
 * is often not the person on shift when it is noticed.
 *
 * Held for half a minute. It ran on every navigation of every screen on every
 * tablet, to answer a question whose answer is a day old by definition — and
 * whose answer is "none" on all but a handful of mornings a year.
 */
export const staleShifts = memo<StaleShift[]>("pos:stale-shifts", TTL.stale, async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data, error } = await supabaseAdminLive
    .from("pos_shifts")
    /* The foreign key has to be named. pos_shifts points at pos_staff twice —
       once for who opened the shift and once for who closed it — and an
       unqualified embed is ambiguous, which PostgREST refuses outright. It
       failed silently behind the guard below, so the warning simply never
       appeared. */
    .select("id, opened_at, shift_label, opened_by:pos_staff!pos_shifts_staff_uuid_fkey(name, staff_id)")
    .eq("status", "open")
    .lt("opened_at", startOfToday.toISOString())
    .order("opened_at", { ascending: true });

  if (error || !data) return [];

  return (data as unknown as {
    id: string;
    opened_at: string;
    shift_label: string;
    opened_by: { name: string; staff_id: string } | null;
  }[]).map((row) => ({
    id: row.id,
    staff_name: row.opened_by?.name || row.opened_by?.staff_id || "Unknown",
    shift_label: row.shift_label,
    opened_at: row.opened_at,
    days_old: Math.max(
      1,
      Math.floor((startOfToday.getTime() - new Date(row.opened_at).getTime()) / 86_400_000) + 1,
    ),
  }));
});

/* ─── A trading day's worth of shifts ─────────────────────────────────────── */

/**
 * Every shift on one business day, open ones included.
 *
 * The open ones are the point as much as the closed ones: a day close cannot
 * be signed off while somebody is still trading, and the screen has to be able
 * to say who. See supabase/pos_business_days.sql for why the day is a stored
 * column rather than a date range over opened_at.
 */
export async function shiftsForBusinessDay(date: string): Promise<DayShift[]> {
  const { data, error } = await supabaseAdminLive
    .from("pos_shifts")
    .select(
      "id, status, shift_label, opened_at, closed_at, opening_float, gross_sales, discount_total, refund_total, vat_total, net_sales, cash_sales, card_sales, online_sales, expense_total, order_count, expected_cash, closing_cash, difference, opened_by:pos_staff!pos_shifts_staff_uuid_fkey(name, staff_id)",
    )
    // Named foreign key for the same reason staleShifts() names one: pos_shifts
    // points at pos_staff twice and PostgREST refuses to guess.
    .eq("business_date", date)
    .order("opened_at", { ascending: true });

  if (error || !data) return [];

  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
    return Number.isFinite(n) ? n : 0;
  };

  return (data as unknown as Record<string, unknown>[]).map((row) => {
    const by = row.opened_by as { name?: string; staff_id?: string } | null;
    return {
      id: String(row.id),
      staff_name: by?.name || by?.staff_id || "Unknown",
      shift_label: String(row.shift_label ?? ""),
      status: row.status === "open" ? "open" : "closed",
      opened_at: String(row.opened_at),
      closed_at: (row.closed_at as string | null) ?? null,
      opening_float: num(row.opening_float),
      gross_sales: num(row.gross_sales),
      discount_total: num(row.discount_total),
      refund_total: num(row.refund_total),
      vat_total: num(row.vat_total),
      net_sales: num(row.net_sales),
      cash_sales: num(row.cash_sales),
      card_sales: num(row.card_sales),
      online_sales: num(row.online_sales),
      expense_total: num(row.expense_total),
      order_count: Math.round(num(row.order_count)),
      expected_cash: num(row.expected_cash),
      closing_cash: num(row.closing_cash),
      difference: num(row.difference),
    };
  });
}

/**
 * Whether a trading day has already been signed off.
 *
 * Checked before a close so two managers on two tablets cannot each produce a
 * daily total, and checked before opening a shift so nobody trades into a day
 * that has been reported — those orders would belong to a total already sent.
 */
export async function businessDayClosed(date: string): Promise<boolean> {
  const { data } = await supabaseAdminLive
    .from("pos_business_days")
    .select("id")
    .eq("business_date", date)
    .maybeSingle();
  return Boolean(data);
}

/** The trading day a shift opening right now belongs to. */
export function currentBusinessDate(): string {
  return businessDateFor();
}
