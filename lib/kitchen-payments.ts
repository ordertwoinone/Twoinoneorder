import type { SupabaseClient } from "@supabase/supabase-js";

/** Payment actions for any order not cancelled, shared by the Payments and Credit routes. */

export type PaymentAction =
  | { action: "pay"; method: "card" | "cash" }
  | { action: "credit"; name: string; phone: string }
  | { action: "undo" };

export function parsePaymentAction(body: Record<string, unknown>): PaymentAction | { error: string } {
  if (body?.action === "undo") return { action: "undo" };
  if (body?.action === "pay") {
    if (body.method === "card" || body.method === "cash") return { action: "pay", method: body.method };
    return { error: "Choose card or cash." };
  }
  if (body?.action === "credit") {
    const name = String(body.name ?? "").trim().slice(0, 120);
    const phone = String(body.phone ?? "").trim().slice(0, 30);
    if (!name) return { error: "Enter the customer's name." };
    if (!/^\+?[\d\s()-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7) {
      return { error: "Enter a valid phone number." };
    }
    return { action: "credit", name, phone };
  }
  return { error: "That action isn't valid." };
}

interface PaymentState {
  paid_at: string | null;
  credit_at: string | null;
}

/** The columns an action sets, given where the order stands now. */
export function paymentPatch(action: PaymentAction, current: PaymentState, now: string): Record<string, unknown> {
  switch (action.action) {
    case "pay":
      // credit_* stay on a settled credit, as the record of who owed it.
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

export async function applyPayment(
  client: SupabaseClient,
  id: string,
  body: Record<string, unknown>,
): Promise<{ status: number; error?: string }> {
  const action = parsePaymentAction(body);
  if ("error" in action) return { status: 400, error: action.error };

  const { data: order, error: readError } = await client
    .from("kitchen_orders")
    .select("paid_at, credit_at, status")
    .eq("id", id)
    .maybeSingle();
  if (readError) return { status: 500, error: readError.message };
  if (!order || order.status === "cancelled") return { status: 404, error: "That order has been cancelled." };

  const now = new Date().toISOString();
  const { error } = await client
    .from("kitchen_orders")
    .update({ ...paymentPatch(action, order, now), updated_at: now })
    .eq("id", id);
  return error ? { status: 500, error: error.message } : { status: 200 };
}
