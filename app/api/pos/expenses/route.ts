export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
import { can } from "@/lib/pos/permissions";
import { openShiftFor } from "@/lib/pos/shift-server";
import { getPosSettings } from "@/lib/pos/menu-server";

/**
 * Money paid out of the drawer during a shift.
 *
 * Only cash expenses come off the drawer at close — a card or transfer payment
 * is recorded for the books but never touched the till, and deducting it would
 * make every drawer read short by the same amount.
 */

const METHODS = ["cash", "card", "transfer"];

export async function GET() {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const shift = await openShiftFor(staff.id);

  const [expensesRes, categoriesRes, settings] = await Promise.all([
    shift
      ? supabaseAdminLive
          .from("pos_expenses")
          .select("*")
          .eq("shift_id", shift.id)
          .order("spent_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabaseAdminLive
      .from("pos_expense_categories")
      .select("label")
      .eq("is_active", true)
      .order("sort_order"),
    getPosSettings(),
  ]);

  return NextResponse.json({
    expenses: expensesRes.data ?? [],
    categories: (categoriesRes.data ?? []).map((c) => (c as { label: string }).label),
    managerExpenseOver: settings.manager_expense_over,
    shift,
  });
}

export async function POST(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!can(staff, "expenses")) {
    return NextResponse.json({ error: "You are not set up to record expenses" }, { status: 403 });
  }

  const shift = await openShiftFor(staff.id);
  if (!shift) {
    return NextResponse.json({ error: "Open your shift before recording expenses" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const amount = Math.round((Number(body?.amount) || 0) * 100) / 100;

  if (amount <= 0) return NextResponse.json({ error: "Enter an amount" }, { status: 400 });
  if (!String(body?.category ?? "").trim()) {
    return NextResponse.json({ error: "Pick a category" }, { status: 400 });
  }

  const settings = await getPosSettings();

  /* Over the threshold, somebody who can approve one has to be signed in.
     Checked against the session, never a flag from the screen — an approval
     the client could assert is not an approval. */
  if (amount >= settings.manager_expense_over && !can(staff, "approve_expense")) {
    return NextResponse.json(
      {
        error: `Expenses of AED ${settings.manager_expense_over} or more need a manager. Ask one to sign in.`,
      },
      { status: 403 },
    );
  }

  const method = METHODS.includes(body?.payment_method) ? body.payment_method : "cash";

  /*
   * The VAT the invoice states, when somebody typed it.
   *
   * Left blank is not zero: "nobody recorded it" and "the supplier charged
   * none" are different facts, and only the second one is a claim about the
   * money. Blank stays null.
   *
   * Capped at the amount, because VAT inside a total cannot exceed the total —
   * a slip of the keyboard there would otherwise put a reclaim on the books
   * larger than the purchase it came from.
   */
  const rawVat = body?.vat_amount;
  const vatGiven = rawVat !== undefined && rawVat !== null && String(rawVat).trim() !== "";
  const vatAmount = vatGiven
    ? Math.min(amount, Math.max(0, Math.round((Number(rawVat) || 0) * 100) / 100))
    : null;

  const row = {
    shift_id: shift.id,
    staff_uuid: staff.id,
    category: String(body.category).trim().slice(0, 80),
    description: String(body?.description ?? "").trim().slice(0, 300),
    supplier: String(body?.supplier ?? "").trim().slice(0, 160),
    reference: String(body?.reference ?? "").trim().slice(0, 80),
    amount,
    payment_method: method,
    /* Typing a VAT figure is itself the statement that the amount carries VAT,
       so the old flag follows the new field rather than needing its own tick —
       there was never a control for it, which is why every row written before
       today says false. */
    vat_included: vatGiven ? true : Boolean(body?.vat_included),
    vat_amount: vatAmount,
    receipt_url: String(body?.receipt_url ?? "").trim().slice(0, 500),
    note: String(body?.note ?? "").trim().slice(0, 500),
    // Only recorded as approved by someone who could have approved it.
    approved_by: can(staff, "approve_expense") ? staff.id : null,
  };

  const write = (fields: Record<string, unknown>) =>
    supabaseAdminLive.from("pos_expenses").insert([fields]).select().single();

  let { data, error } = await write(row);

  /* vat_amount arrives with supabase/pos_expense_vat.sql. Between deploying
     this and running that file the insert fails on the unknown column, and
     losing a cashier's expense over a field they left blank is worse than
     recording it without the figure. */
  if (error && String(error.message ?? "").includes("vat_amount")) {
    const rest: Record<string, unknown> = { ...row };
    delete rest.vat_amount;
    ({ data, error } = await write(rest));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
