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
  /** Handed back on orders that still stand — a dish taken off a paid order. */
  refundTotal: number;
  refundedCount: number;
  /** Paid orders that were cancelled outright. */
  cancelledTotal: number;
  cancelledCount: number;
  vatTotal: number;
  /** What the branch actually kept. */
  netSales: number;
  cashSales: number;
  cardSales: number;
  onlineSales: number;
  /* Food that went out without money arriving. Named separately because each
     is a different question for a manager: a staff meal is a cost, a credit is
     a debt somebody owes, and a pending is a sale that has not happened yet. */
  staffFoodTotal: number;
  staffFoodCount: number;
  creditTotal: number;
  creditCount: number;
  pendingTotal: number;
  pendingCount: number;
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
  /** What has been handed back on this order, across every refund on it. */
  refunded_total: number | string | null;
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

export async function shiftTakings(shiftId: string, openingFloat: number): Promise<ShiftTakings> {
  const [ordersRes, expensesRes] = await Promise.all([
    supabaseAdminLive
      .from("bookings")
      .select(
        "status, payment_method, total_amount, discount_total, tax_amount, refunded_total",
      )
      .eq("pos_shift_id", shiftId),
    supabaseAdminLive.from("pos_expenses").select("amount, payment_method").eq("shift_id", shiftId),
  ]);

  const orders = (ordersRes.data ?? []) as OrderRow[];
  const expenses = (expensesRes.data ?? []) as { amount: number | string; payment_method: string }[];

  let grossSales = 0;
  let discountTotal = 0;
  let refundTotal = 0;
  let refundedCount = 0;
  let cancelledTotal = 0;
  let cancelledCount = 0;
  let vatTotal = 0;
  let cashSales = 0;
  let cardSales = 0;
  let onlineSales = 0;
  let staffFoodTotal = 0;
  let staffFoodCount = 0;
  let creditTotal = 0;
  let creditCount = 0;
  let pendingTotal = 0;
  let pendingCount = 0;
  let orderCount = 0;

  for (const order of orders) {
    const total = num(order.total_amount);
    const refunded = num(order.refunded_total);
    const method = (order.payment_method ?? "pending").trim().toLowerCase();
    const cancelled = (order.status ?? "").toLowerCase() === "cancelled";

    /*
     * Food that went out with no money arriving. None of it is revenue and
     * none of it is in the drawer, so it is counted, named, and kept out of
     * every other figure on the screen.
     *
     * They used to fall through to "online" for want of anywhere else to go,
     * which booked every staff lunch as an online sale and left a manager
     * looking at takings that were never taken.
     */
    /* Cancelled first, because a staff meal that was cancelled is not a staff
       meal — it is nothing at all, and counting it would put food the branch
       never gave away into the figure it uses to decide how much it does. */
    if (method === "staff_food") {
      if (!cancelled) {
        staffFoodTotal += total;
        staffFoodCount += 1;
        /* Into gross, and taken straight back out below. Food that left the
           kitchen is gross sales whoever ate it — leaving it out entirely made
           "gross" quietly mean "gross, apart from the staff lunches", and a
           manager comparing what went out of the pass against the takings had
           nothing on the screen that reconciled the two. Now it is a line you
           can point at: this much went out, this much of it was not sold. */
        grossSales += total;
      }
      continue;
    }
    if (method === "credit") {
      if (!cancelled) {
        creditTotal += total;
        creditCount += 1;
        grossSales += total;
      }
      continue;
    }
    if (method === "pending" || method === "") {
      if (!cancelled) {
        pendingTotal += total;
        pendingCount += 1;
        grossSales += total;
      }
      continue;
    }

    /*
     * A cancelled order that was paid: the money came in and went straight
     * back out, so the drawer is exactly where it started and the day made
     * nothing on it. Named on its own line rather than folded into refunds —
     * "we cancelled three orders" and "we took a dish off three orders" are
     * different mornings, and a manager wants to be able to tell them apart.
     */
    if (cancelled) {
      cancelledTotal += total;
      cancelledCount += 1;
      continue;
    }

    /* Standing, settled, and possibly a dish lighter than when it was rung up.
       The refund comes off the payment bucket as well as off net sales,
       because that is the money that physically left the drawer. */
    const kept = roundMoney(total - refunded);

    orderCount += 1;
    grossSales += total + num(order.discount_total);
    discountTotal += num(order.discount_total);
    vatTotal += num(order.tax_amount);

    if (refunded > 0) {
      refundTotal += refunded;
      refundedCount += 1;
    }

    switch (method) {
      case "cash":
        cashSales += kept;
        break;
      case "card":
        cardSales += kept;
        break;
      default:
        onlineSales += kept;
    }
  }

  let cashExpenses = 0;
  let expenseTotal = 0;
  for (const expense of expenses) {
    const amount = num(expense.amount);
    expenseTotal += amount;
    if (expense.payment_method === "cash") cashExpenses += amount;
  }

  /*
   * What the branch actually kept.
   *
   * Gross is everything that left the kitchen; net is what came back for it.
   * Written as the sum of the three collected buckets rather than as gross
   * minus the deductions, because those are the figures the drawer and the
   * card machine can be checked against — and the two agree by construction:
   * gross − discounts − refunds − staff food − credit − pending is exactly
   * cash + card + online.
   */
  const netSales = roundMoney(cashSales + cardSales + onlineSales);

  return {
    orderCount,
    grossSales: roundMoney(grossSales),
    discountTotal: roundMoney(discountTotal),
    refundTotal: roundMoney(refundTotal),
    refundedCount,
    cancelledTotal: roundMoney(cancelledTotal),
    cancelledCount,
    vatTotal: roundMoney(vatTotal),
    netSales,
    cashSales: roundMoney(cashSales),
    cardSales: roundMoney(cardSales),
    onlineSales: roundMoney(onlineSales),
    staffFoodTotal: roundMoney(staffFoodTotal),
    staffFoodCount,
    creditTotal: roundMoney(creditTotal),
    creditCount,
    pendingTotal: roundMoney(pendingTotal),
    pendingCount,
    cashExpenses: roundMoney(cashExpenses),
    expenseTotal: roundMoney(expenseTotal),
    /* Only cash moves the drawer. Card takings never went into it, and neither
       did a staff meal or an order somebody is settling at the end of the
       month. Nothing subtracts refunds here because cashSales is already net
       of them — each order contributed what it kept, not what it charged. */
    expectedCash: roundMoney(openingFloat + cashSales - cashExpenses),
    averageOrder: orderCount > 0 ? roundMoney(netSales / orderCount) : 0,
  };
}

/**
 * The message the shift-close screen offers to send.
 *
 * One shift, and it says so. It used to be headed "Day Close", which is where
 * a good deal of the confusion started: a cashier handing over at four sent
 * management something that read like the day's takings and was a third of it.
 * The day's own report is built in lib/pos/business-day.ts.
 */
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
    `*${input.branch} — Shift Close*`,
    `${input.shiftLabel} shift · ${input.staffName}`,
    `${time(input.openedAt)} – ${time(input.closedAt)}`,
    "",
    `Orders: ${t.orderCount}`,
    `Gross sales: ${money(t.grossSales)}`,
    t.discountTotal > 0 ? `Discounts: -${money(t.discountTotal)}` : "",
    t.refundTotal > 0 ? `Refunded payments: -${money(t.refundTotal)}` : "",
    t.cancelledTotal > 0 ? `Cancelled orders: -${money(t.cancelledTotal)}` : "",
    t.staffFoodTotal > 0 ? `Staff food (not paid): ${money(t.staffFoodTotal)}` : "",
    t.creditTotal > 0 ? `On credit: ${money(t.creditTotal)}` : "",
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
