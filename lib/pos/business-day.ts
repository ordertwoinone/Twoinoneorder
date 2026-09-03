/**
 * Which trading day a moment belongs to.
 *
 * Not the calendar date. A branch that serves until one in the morning has an
 * evening shift whose last forty orders land after midnight, and dating those
 * by the clock puts them in a day nobody has opened yet — the manager closing
 * up at 2am signs off a day that is missing its own last hour, and tomorrow
 * opens carrying it.
 *
 * So the day turns over at 5am rather than at midnight: late enough that the
 * night's trading is behind it, early enough that nobody is still serving.
 *
 * Pure arithmetic, no database, so both the till screens and the server can
 * import it — the same split as lib/pos/shift.ts.
 */

/** The hour the trading day rolls over, in the branch's own clock. */
export const DAY_ROLLOVER_HOUR = 5;

/** The branch is in Dubai; a server in Frankfurt must not decide otherwise. */
export const BRANCH_TIME_ZONE = "Asia/Dubai";

/** The branch's wall clock for an instant, as a plain y/m/d/h. */
function branchParts(at: Date): { year: number; month: number; day: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BRANCH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(at);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // Intl renders midnight as hour 24 in some runtimes; 24 and 0 are the same
  // instant and only one of them is before the rollover.
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") % 24 };
}

/** "2026-09-03" — the trading day an instant falls in. */
export function businessDateFor(at: Date = new Date()): string {
  const { year, month, day, hour } = branchParts(at);
  // Before the rollover is still yesterday's trading. Built through UTC so the
  // subtraction cannot trip over a month boundary or a leap year.
  const asUtc = Date.UTC(year, month - 1, day) - (hour < DAY_ROLLOVER_HOUR ? 86_400_000 : 0);
  return new Date(asUtc).toISOString().slice(0, 10);
}

/** "Wed 3 Sep 2026", for a heading. */
export function businessDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** One shift as the day-close screen lists it. */
export interface DayShift {
  id: string;
  staff_name: string;
  shift_label: string;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  opening_float: number;
  net_sales: number;
  cash_sales: number;
  card_sales: number;
  online_sales: number;
  gross_sales: number;
  discount_total: number;
  refund_total: number;
  vat_total: number;
  expense_total: number;
  order_count: number;
  expected_cash: number;
  closing_cash: number;
  difference: number;
}

/** The day's combined figures. Summed from the shifts, never recounted. */
export interface DayTotals {
  shiftCount: number;
  orderCount: number;
  grossSales: number;
  discountTotal: number;
  refundTotal: number;
  vatTotal: number;
  netSales: number;
  cashSales: number;
  cardSales: number;
  onlineSales: number;
  expenseTotal: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Adding the shifts up.
 *
 * Closed shifts only. An open one has no counted drawer and no frozen figures,
 * so including it would mix a half-finished shift into a signed-off total —
 * which is why the screen refuses to close a day that still has one running
 * rather than quietly leaving it out.
 */
export function sumShifts(shifts: DayShift[]): DayTotals {
  const closed = shifts.filter((s) => s.status === "closed");
  const add = (pick: (s: DayShift) => number) => round(closed.reduce((t, s) => t + (pick(s) || 0), 0));

  return {
    shiftCount: closed.length,
    orderCount: closed.reduce((t, s) => t + (s.order_count || 0), 0),
    grossSales: add((s) => s.gross_sales),
    discountTotal: add((s) => s.discount_total),
    refundTotal: add((s) => s.refund_total),
    vatTotal: add((s) => s.vat_total),
    netSales: add((s) => s.net_sales),
    cashSales: add((s) => s.cash_sales),
    cardSales: add((s) => s.card_sales),
    onlineSales: add((s) => s.online_sales),
    expenseTotal: add((s) => s.expense_total),
    expectedCash: add((s) => s.expected_cash),
    countedCash: add((s) => s.closing_cash),
    difference: add((s) => s.difference),
  };
}

/** The message the day close offers to send to management. */
export function dayReport(input: {
  branch: string;
  date: string;
  managerName: string;
  totals: DayTotals;
  shifts: DayShift[];
}): string {
  const money = (n: number) => `AED ${n.toFixed(2)}`;
  const time = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";
  const t = input.totals;

  return [
    `*${input.branch} — Day Close*`,
    businessDateLabel(input.date),
    `Signed off by ${input.managerName}`,
    "",
    `Shifts: ${t.shiftCount}`,
    ...input.shifts
      .filter((s) => s.status === "closed")
      .map(
        (s) =>
          `· ${s.shift_label} — ${s.staff_name} (${time(s.opened_at)}–${time(s.closed_at)}) ${money(s.net_sales)}` +
          (s.difference === 0 ? "" : ` ${s.difference > 0 ? "over" : "short"} ${money(Math.abs(s.difference))}`),
      ),
    "",
    `Orders: ${t.orderCount}`,
    `Gross sales: ${money(t.grossSales)}`,
    t.discountTotal > 0 ? `Discounts: -${money(t.discountTotal)}` : "",
    t.refundTotal > 0 ? `Refunds: -${money(t.refundTotal)}` : "",
    `*Net sales: ${money(t.netSales)}*`,
    `VAT included: ${money(t.vatTotal)}`,
    "",
    `Cash: ${money(t.cashSales)}`,
    `Card: ${money(t.cardSales)}`,
    `Online: ${money(t.onlineSales)}`,
    t.expenseTotal > 0 ? `Expenses: ${money(t.expenseTotal)}` : "",
    "",
    `Expected in drawers: ${money(t.expectedCash)}`,
    `Counted: ${money(t.countedCash)}`,
    t.difference === 0
      ? "Balanced"
      : `*${t.difference > 0 ? "Over" : "Short"} by ${money(Math.abs(t.difference))}*`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}
