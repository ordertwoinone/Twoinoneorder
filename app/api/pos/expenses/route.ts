export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
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

  /* Over the threshold a manager has to be the one signed in. Checked against
     the session's role, never a flag from the screen — an approval that the
     client could assert is not an approval. */
  if (amount >= settings.manager_expense_over && staff.role !== "manager") {
    return NextResponse.json(
      {
        error: `Expenses of AED ${settings.manager_expense_over} or more need a manager. Ask one to sign in.`,
      },
      { status: 403 },
    );
  }

  const method = METHODS.includes(body?.payment_method) ? body.payment_method : "cash";

  const { data, error } = await supabaseAdminLive
    .from("pos_expenses")
    .insert([
      {
        shift_id: shift.id,
        staff_uuid: staff.id,
        category: String(body.category).trim().slice(0, 80),
        description: String(body?.description ?? "").trim().slice(0, 300),
        supplier: String(body?.supplier ?? "").trim().slice(0, 160),
        reference: String(body?.reference ?? "").trim().slice(0, 80),
        amount,
        payment_method: method,
        vat_included: Boolean(body?.vat_included),
        receipt_url: String(body?.receipt_url ?? "").trim().slice(0, 500),
        note: String(body?.note ?? "").trim().slice(0, 500),
        approved_by: staff.role === "manager" ? staff.id : null,
      },
    ])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
