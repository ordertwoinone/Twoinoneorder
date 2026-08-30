import { supabaseAdminLive } from "@/lib/supabase-admin";
import { roundMoney } from "@/lib/kalba/pricing";

/**
 * What a shift actually took.
 *
 * Worked out by reading the orders and the expenses back, every time it is
 * asked for, rather than kept as a running total on the shift row. A counter
 * incremented on every sale is a figure nobody can check: if it ever drifts
 * from the orders there is no way to tell which one is wrong. Reading the
 * orders is slower and always right, and a shift is a few hundred rows.
 *
 * The numbers are frozen onto the shift row at close — not as the source of
 * truth, but so the reconciliation can be reprinted later exactly as it was
 * signed off, even after an order is refunded or amended.
 */

export interface ShiftTakings {
  orderCount: number;
  /** What the food came to before anything was taken off. */
  grossSales: number;
  discountTotal: number;
  refundTotal: number;
  vatTotal: number;
  /** What was actually charged. */
  netSales: number;
  cashSales: number;
  cardSales: number;
  onlineSales: number;
  /** Paid out of the drawer in cash. Card and transfer expenses are excluded. */
  cashExpenses: number;
  expenseTotal: number;
  /** Float + cash taken − cash refunded − cash paid out. */
  expectedCash: number;
  averageOrder: number;
}

interface OrderRow {
  status: string | null;
  payment_method: string | null;
  total_amount: number | string | null;
  discount_total: number | string | null;
  tax_amount: number | string | null;
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

export async function shiftTakings(shiftId: string, openingFloat: number): Promise<ShiftTakings> {
  const [ordersRes, expensesRes] = await Promise.all([
    supabaseAdminLive
      .from("bookings")
      .select("status, payment_method, total_amount, discount_total, tax_amount")
      .eq("pos_shift_id", shiftId),
    supabaseAdminLive.from("pos_expenses").select("amount, payment_method").eq("shift_id", shiftId),
  ]);

  const orders = (ordersRes.data ?? []) as OrderRow[];
  const expenses = (expensesRes.data ?? []) as { amount: number | string; payment_method: string }[];

  let netSales = 0;
  let discountTotal = 0;
  let refundTotal = 0;
  let vatTotal = 0;
  let cashSales = 0;
  let cardSales = 0;
  let onlineSales = 0;
  let orderCount = 0;

  for (const order of orders) {
    const total = num(order.total_amount);

    /* A cancelled order is a refund, not a sale that did not happen: the money
       was taken and given back, and the drawer has to account for both. */
    if ((order.status ?? "").toLowerCase() === "cancelled") {
      refundTotal += total;
      if ((order.payment_method ?? "") === "cash") cashSales -= total;
      continue;
    }

    orderCount += 1;
    netSales += total;
    discountTotal += num(order.discount_total);
    vatTotal += num(order.tax_amount);

    switch (order.payment_method) {
      case "cash":
        cashSales += total;
        break;
      case "card":
        cardSales += total;
        break;
      default:
        onlineSales += total;
    }
  }

  let cashExpenses = 0;
  let expenseTotal = 0;
  for (const expense of expenses) {
    const amount = num(expense.amount);
    expenseTotal += amount;
    if (expense.payment_method === "cash") cashExpenses += amount;
  }

  return {
    orderCount,
    grossSales: roundMoney(netSales + discountTotal),
    discountTotal: roundMoney(discountTotal),
    refundTotal: roundMoney(refundTotal),
    vatTotal: roundMoney(vatTotal),
    netSales: roundMoney(netSales),
    cashSales: roundMoney(cashSales),
    cardSales: roundMoney(cardSales),
    onlineSales: roundMoney(onlineSales),
    cashExpenses: roundMoney(cashExpenses),
    expenseTotal: roundMoney(expenseTotal),
    // Only cash moves the drawer. Card takings never went into it.
    expectedCash: roundMoney(openingFloat + cashSales - cashExpenses),
    averageOrder: orderCount > 0 ? roundMoney(netSales / orderCount) : 0,
  };
}

/** The message the day-close screen offers to send to management. */
export function whatsappSummary(input: {
  branch: string;
  staffName: string;
  shiftLabel: string;
  openedAt: string;
  closedAt: string;
  takings: ShiftTakings;
  countedCash: number;
  difference: number;
}): string {
  const { takings: t } = input;
  const money = (n: number) => `AED ${n.toFixed(2)}`;
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return [
    `*${input.branch} — Day Close*`,
    `${input.shiftLabel} shift · ${input.staffName}`,
    `${time(input.openedAt)} – ${time(input.closedAt)}`,
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
    `Expected in drawer: ${money(t.expectedCash)}`,
    `Counted: ${money(input.countedCash)}`,
    input.difference === 0
      ? "Balanced"
      : `*${input.difference > 0 ? "Over" : "Short"} by ${money(Math.abs(input.difference))}*`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}
