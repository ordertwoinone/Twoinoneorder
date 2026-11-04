import type { SupabaseClient } from "@supabase/supabase-js";
import { roundMoney } from "@/lib/kalba/pricing";

/** Payment actions for any order not cancelled, shared by the Payments and Credit routes. */

export type PaymentAction =
  | { action: "pay"; method: "card" | "cash" }
  | { action: "credit"; name: string; phone: string }
  | {
      action: "settle";
      /** The order's whole discount in AED, replacing any given before. */
      discount: number;
      cash: number;
      card: number;
      /** Puts whatever is left on credit. */
      credit: { name: string; phone: string } | null;
    }
  | { action: "undo" };

export const PAYMENT_METHOD_LABELS: Record<string, string> = { card: "Card", cash: "Cash", split: "Cash + card" };

/** The money columns of an order, as read from the database. */
export interface OrderMoney {
  total: number | string;
  discount?: number | string | null;
  paid_amount?: number | string | null;
}

/** What is still to pay: the total, less the discount and anything already taken. */
export function balanceDue(order: OrderMoney): number {
  return roundMoney(Number(order.total) - Number(order.discount ?? 0) - Number(order.paid_amount ?? 0));
}

const amount = (v: unknown) => (v === "" || v === null || v === undefined ? 0 : Number(v));

function parseCustomer(body: Record<string, unknown>): { name: string; phone: string } | { error: string } {
  const name = String(body.name ?? "").trim().slice(0, 120);
  const phone = String(body.phone ?? "").trim().slice(0, 30);
  if (!name) return { error: "Enter the customer's name." };
  if (!/^\+?[\d\s()-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7) {
    return { error: "Enter a valid phone number." };
  }
  return { name, phone };
}

export function parsePaymentAction(body: Record<string, unknown>): PaymentAction | { error: string } {
  if (body?.action === "undo") return { action: "undo" };
  if (body?.action === "pay") {
    if (body.method === "card" || body.method === "cash") return { action: "pay", method: body.method };
    return { error: "Choose card or cash." };
  }
  if (body?.action === "credit") {
    const customer = parseCustomer(body);
    return "error" in customer ? customer : { action: "credit", ...customer };
  }
  if (body?.action === "settle") {
    const discount = amount(body.discount);
    const cash = amount(body.cash);
    const card = amount(body.card);
    if (![discount, cash, card].every((n) => Number.isFinite(n) && n >= 0)) {
      return { error: "Amounts must be 0 or more." };
    }
    let credit = null;
    if (body.credit && typeof body.credit === "object") {
      const customer = parseCustomer(body.credit as Record<string, unknown>);
      if ("error" in customer) return customer;
      credit = customer;
    }
    return { action: "settle", discount: roundMoney(discount), cash: roundMoney(cash), card: roundMoney(card), credit };
  }
  return { error: "That action isn't valid." };
}

interface PaymentState extends OrderMoney {
  paid_at: string | null;
  payment_method: string | null;
  credit_name?: string | null;
  credit_phone?: string | null;
  credit_at: string | null;
  cash_amount?: number | string | null;
  card_amount?: number | string | null;
}

/** The columns a settle may change, saved on its event so it can be undone exactly. */
const SNAPSHOT_COLUMNS = [
  "discount", "paid_amount", "cash_amount", "card_amount",
  "payment_method", "paid_at", "credit_name", "credit_phone", "credit_at",
] as const;

/** How the whole order was paid, from all the money taken for it. */
function methodFor(cash: number, card: number): string | null {
  if (cash > 0 && card > 0) return "split";
  if (card > 0) return "card";
  if (cash > 0) return "cash";
  return null;
}

/**
 * The columns a settle sets, or why it can't be done. Cash beyond the balance
 * is change handed back, so only what was kept is recorded.
 */
export function settlePatch(
  action: Extract<PaymentAction, { action: "settle" }>,
  current: PaymentState,
  now: string,
): { patch: Record<string, unknown>; change: number } | { error: string } {
  const total = Number(current.total);
  const already = Number(current.paid_amount ?? 0);
  if (action.discount > roundMoney(total - already)) {
    return { error: `The discount can't be more than ${(total - already).toFixed(2)}, what's left of the order.` };
  }

  const due = roundMoney(total - action.discount - already);
  if (action.card > due) return { error: `Card is more than the ${due.toFixed(2)} to pay.` };
  const change = Math.max(0, roundMoney(action.cash + action.card - due));
  const cash = roundMoney(action.cash - change);
  const left = roundMoney(due - cash - action.card);

  const cashTotal = roundMoney(Number(current.cash_amount ?? 0) + cash);
  const cardTotal = roundMoney(Number(current.card_amount ?? 0) + action.card);
  const money = {
    discount: action.discount,
    paid_amount: roundMoney(already + cash + action.card),
    cash_amount: cashTotal,
    card_amount: cardTotal,
  };

  if (left <= 0) {
    // credit_* stay on a settled credit, as the record of who owed it.
    return { patch: { ...money, payment_method: methodFor(cashTotal, cardTotal), paid_at: now }, change };
  }
  if (action.credit) {
    return {
      patch: {
        ...money,
        payment_method: "credit",
        paid_at: null,
        credit_name: action.credit.name,
        credit_phone: action.credit.phone,
        credit_at: current.credit_at ?? now,
      },
      change,
    };
  }
  // Left on Payments or Credit, wherever it was, with a smaller balance.
  return { patch: { ...money, paid_at: null }, change };
}

/** The columns an older action sets, given where the order stands now. */
export function paymentPatch(action: Exclude<PaymentAction, { action: "settle" }>, current: PaymentState, now: string): Record<string, unknown> {
  switch (action.action) {
    case "pay":
      // Settled through settlePatch instead; kept for the types.
      return { payment_method: action.method, paid_at: now };
    case "credit":
      return {
        payment_method: "credit",
        paid_at: null,
        credit_name: action.name,
        credit_phone: action.phone,
        credit_at: now,
      };
    case "undo":
      // Undoing a settled credit puts the debt back, rather than forgetting it.
      return current.paid_at && current.credit_at
        ? { payment_method: "credit", paid_at: null }
        : { payment_method: null, paid_at: null, credit_name: null, credit_phone: null, credit_at: null };
  }
}

interface PaymentEvent {
  type: string;
  at: string;
  before?: Record<string, unknown>;
  undoes?: string;
}

export async function applyPayment(
  client: SupabaseClient,
  update: (table: string, id: string, row: Record<string, unknown>) => PromiseLike<{ error: { message?: string } | null }>,
  id: string,
  body: Record<string, unknown>,
): Promise<{ status: number; error?: string; change?: number }> {
  const parsed = parsePaymentAction(body);
  if ("error" in parsed) return { status: 400, error: parsed.error };

  const { data: order, error: readError } = await client
    .from("kitchen_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (readError) return { status: 500, error: readError.message };
  if (!order || order.status === "cancelled") return { status: 404, error: "That order has been cancelled." };

  // Otherwise the writer would quietly drop the discount and the split.
  if (parsed.action === "settle" && !("cash_amount" in order)) {
    return { status: 500, error: "Run supabase/kitchen_order_split_payments.sql in the Supabase SQL editor first." };
  }

  const now = new Date().toISOString();
  const events: PaymentEvent[] = order.events ?? [];
  const before = Object.fromEntries(SNAPSHOT_COLUMNS.filter((c) => c in order).map((c) => [c, order[c]]));

  // Card or cash for the whole balance is a settle with nothing else.
  const action: PaymentAction =
    parsed.action === "pay"
      ? {
          action: "settle",
          discount: Number(order.discount ?? 0),
          cash: parsed.method === "cash" ? balanceDue(order) : 0,
          card: parsed.method === "card" ? balanceDue(order) : 0,
          credit: null,
        }
      : parsed;

  let patch: Record<string, unknown>;
  let event: PaymentEvent & Record<string, unknown>;
  let change = 0;

  if (action.action === "settle") {
    if (order.paid_at) return { status: 409, error: "That order is already paid." };
    const result = settlePatch(action, order, now);
    if ("error" in result) return { status: 400, error: result.error };
    patch = result.patch;
    change = result.change;
    const paidNow = roundMoney(Number(patch.paid_amount) - Number(order.paid_amount ?? 0));
    event = {
      type: patch.paid_at ? "paid" : patch.payment_method === "credit" && !order.credit_at ? "credit" : "part_paid",
      at: now,
      method: methodFor(roundMoney(Number(patch.cash_amount) - Number(order.cash_amount ?? 0)), roundMoney(Number(patch.card_amount) - Number(order.card_amount ?? 0))) ?? undefined,
      amount: paidNow,
      ...(action.discount !== Number(order.discount ?? 0) && { discount: action.discount }),
      before,
    };
  } else if (action.action === "undo") {
    // The latest payment not undone yet, put back exactly as it found the order.
    const undone = new Set(events.map((e) => e.undoes).filter(Boolean));
    const last = [...events].reverse().find((e) => ["paid", "credit", "part_paid"].includes(e.type) && !undone.has(e.at));
    patch = last?.before ? { ...last.before } : paymentPatch(action, order, now);
    event = { type: "payment_undone", at: now, ...(last && { undoes: last.at }) };
  } else {
    patch = paymentPatch(action, order, now);
    event = { type: "credit", at: now, before };
  }

  // Through the caller's writer, so a column not added yet can't lose the payment.
  const { error } = await update("kitchen_orders", id, { ...patch, events: [...events, event] });
  return error ? { status: 500, error: error.message ?? "Could not save." } : { status: 200, change };
}
