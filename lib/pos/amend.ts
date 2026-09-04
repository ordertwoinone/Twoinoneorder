import { roundMoney, vatIncludedIn } from "@/lib/kalba/pricing";

/**
 * Changing an order after it has been rung up.
 *
 * The whole of it turns on one question — has the money changed hands? — and
 * the two answers behave so differently that treating them as one operation is
 * what makes tills lose track of their own takings.
 *
 * UNPAID. Nothing has moved. Removing a dish makes the order smaller and the
 * customer pays the new total. No refund exists because nothing was collected.
 *
 * PAID. The charge stands. Removing a dish records a refund of that line and
 * leaves `total_amount` exactly as it was, with the line marked cancelled
 * inside the items array. That is what makes a receipt printed at the counter
 * and the same receipt reprinted a month later agree — and it is what lets the
 * day close report a sale and a refund, instead of a sale that quietly shrank
 * between the customer paying and the manager counting.
 *
 * Pure arithmetic, no database, so the dialog can preview exactly what the
 * server is about to do before anybody presses the button. Same split as
 * lib/pos/shift.ts and for the same reason.
 */

export interface OrderLine {
  name?: string;
  qty?: number;
  unit_price?: number;
  extras?: string;
  extras_price?: number;
  line_total?: number;
  note?: string;
  /** Taken off the order. Kept in the array so a reprint can strike it out. */
  cancelled?: boolean;
  refunded_at?: string | null;
  /**
   * The counter has asked for this line to come off and the kitchen has not
   * answered yet.
   *
   * Distinct from `cancelled` on purpose: a requested line is still on the
   * order, still charged, and still being cooked until somebody at the pass
   * says otherwise. Nothing is refunded against it.
   */
  cancel_requested?: boolean;
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

/** Whether money has actually changed hands on this order. */
export function isPaid(paymentMethod: string | null | undefined): boolean {
  const m = (paymentMethod ?? "").trim().toLowerCase();
  return m !== "" && m !== "pending";
}

/** What one line is worth, trusting the stored total and falling back to the sum. */
export function lineValue(line: OrderLine): number {
  const stored = num(line.line_total);
  if (stored) return roundMoney(stored);
  const qty = Math.max(1, Math.round(num(line.qty)) || 1);
  return roundMoney((num(line.unit_price) + num(line.extras_price)) * qty);
}

/** The lines still standing — everything not taken off. */
export function liveLines(items: OrderLine[]): OrderLine[] {
  return items.filter((l) => !l.cancelled);
}

/**
 * Whether the kitchen still has a say.
 *
 * A ticket nobody is cooking any more — done, or already cancelled — can be
 * amended at the counter without asking anyone: there is no pan to take it off.
 * One that is still pending or being prepared is the kitchen's, and the counter
 * asks rather than tells.
 */
export function needsKitchenApproval(status: string | null | undefined): boolean {
  const s = (status ?? "").trim().toLowerCase();
  return s === "pending" || s === "confirmed";
}

/** Marks lines as asked-for rather than taken off. Nothing is refunded. */
export function requestCancel(
  items: OrderLine[],
  cancelIndexes: number[],
  cancelAll = false,
): OrderLine[] {
  const wanted = new Set(cancelIndexes);
  return items.map((line, i) => {
    if (line.cancelled) return line;
    if (!cancelAll && !wanted.has(i)) return line;
    return { ...line, cancel_requested: true };
  });
}

/** The kitchen said no. The lines go back to being ordinary lines. */
export function clearCancelRequests(items: OrderLine[]): OrderLine[] {
  return items.map((line) =>
    line.cancel_requested ? { ...line, cancel_requested: false } : line,
  );
}

/** Which lines the kitchen is being asked about. */
export function requestedIndexes(items: OrderLine[]): number[] {
  const out: number[] = [];
  items.forEach((line, i) => {
    if (line.cancel_requested && !line.cancelled) out.push(i);
  });
  return out;
}

/** What the lines still standing come to. */
export function liveTotal(items: OrderLine[]): number {
  return roundMoney(liveLines(items).reduce((sum, l) => sum + lineValue(l), 0));
}

export interface AmendResult {
  /** The items array to store, with the removed lines marked rather than gone. */
  items: OrderLine[];
  /** What the order is charged. Unchanged on a paid order. */
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  /** What this amendment gives back. Always 0 on an unpaid order. */
  refundAmount: number;
  /** The lines being handed back, for the refund's own record. */
  refundedLines: OrderLine[];
}

/**
 * Taking lines off an order.
 *
 * `cancelIndexes` are positions in the stored array, not ids — an order's items
 * are a jsonb array with nothing unique in them, and matching by name would
 * take both helpings when a customer ordered the same dish twice and is
 * cancelling one.
 *
 * Lines already cancelled are ignored rather than refunded twice, which is the
 * difference between a double-tap and paying a customer out twice.
 */
export function amendOrder(input: {
  items: OrderLine[];
  paymentMethod: string | null | undefined;
  /** What has already been given back on this order. */
  refundedTotal: number;
  cancelIndexes: number[];
  /** Everything goes: the whole order is being cancelled. */
  cancelAll?: boolean;
}): AmendResult {
  const paid = isPaid(input.paymentMethod);
  const wanted = new Set(input.cancelIndexes);
  const at = new Date().toISOString();

  const refundedLines: OrderLine[] = [];
  const items = input.items.map((line, i) => {
    if (line.cancelled) return line;
    if (!input.cancelAll && !wanted.has(i)) return line;

    refundedLines.push({ ...line });
    return { ...line, cancelled: true, refunded_at: paid ? at : null };
  });

  const removed = roundMoney(refundedLines.reduce((sum, l) => sum + lineValue(l), 0));
  const standing = liveTotal(items);

  /* On a paid order the charge does not move — the refund is what accounts for
     the difference. On an unpaid one there is no refund and the total simply
     becomes what is left.

     The refund is capped at what is actually still outstanding. Rounding across
     several partial refunds can otherwise creep a fraction past the total, and
     a till that hands back more than it took is worse than one that will not
     round. */
  const outstanding = roundMoney(
    Math.max(0, liveTotalOf(input.items) - input.refundedTotal),
  );
  const refundAmount = paid ? Math.min(removed, outstanding) : 0;
  const totalAmount = paid ? roundMoney(liveTotalOf(input.items)) : standing;

  return {
    items,
    totalAmount,
    subtotal: roundMoney(totalAmount - vatIncludedIn(totalAmount)),
    taxAmount: vatIncludedIn(totalAmount),
    refundAmount,
    refundedLines,
  };
}

/**
 * The order's charge as it stood before this amendment.
 *
 * Every line that was not already cancelled, because a line cancelled earlier
 * has already been refunded and must not be counted towards what is still
 * refundable now.
 */
function liveTotalOf(items: OrderLine[]): number {
  return roundMoney(
    items.filter((l) => !l.cancelled).reduce((sum, l) => sum + lineValue(l), 0),
  );
}

/** What could still be handed back on this order. */
export function refundable(input: {
  items: OrderLine[];
  totalAmount: number;
  refundedTotal: number;
  paymentMethod: string | null | undefined;
}): number {
  if (!isPaid(input.paymentMethod)) return 0;
  return roundMoney(Math.max(0, input.totalAmount - input.refundedTotal));
}
