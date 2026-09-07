export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
import { can } from "@/lib/pos/permissions";
import { roundMoney, vatIncludedIn } from "@/lib/kalba/pricing";
import { businessDateFor, businessDayRange } from "@/lib/pos/business-day";

/**
 * Money paid out of the branch, over a stretch of days.
 *
 * The expenses screen only ever shows the shift you are standing on — which is
 * right for the person recording them and useless for anybody asking what the
 * branch spent last month. Nothing else read pos_expenses across days at all:
 * a shift close deducts its own cash expenses from its own drawer and the day
 * close sums those, so the figure existed in every total and was itemised in
 * none of them.
 *
 * Dated by `spent_at` and windowed on the trading day, like the rest of
 * Reports. An expense recorded at one in the morning belongs to the night that
 * was still being worked, not to the day that had not started.
 */

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

function asDate(value: string | null): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/* supplier, reference, vat_included, receipt_url and note all arrive with
   supabase/pos_operations.sql. Asked for as one group with a fallback, because
   PostgREST fails the whole select on a single unknown column and a report that
   500s is worse than one missing a receipt link. */
const BASE =
  "id, shift_id, staff_uuid, category, description, amount, payment_method, approved_by, spent_at";
const EXTRAS = "supplier, reference, vat_included, receipt_url, note";

export async function GET(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(staff, "reports")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const today = businessDateFor();
  const from = asDate(params.get("from")) ?? today;
  const to = asDate(params.get("to")) ?? today;
  const { start, end } = businessDayRange(from, to);

  const query = (columns: string) =>
    supabaseAdminLive
      .from("pos_expenses")
      .select(columns)
      .gte("spent_at", start.toISOString())
      .lt("spent_at", end.toISOString())
      .order("spent_at", { ascending: false })
      .limit(2000);

  let res = await query(`${BASE}, ${EXTRAS}`);
  if (res.error) res = await query(BASE);
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });

  const rows = (res.data ?? []) as unknown as Record<string, unknown>[];

  /* Who spent it and which shift it came off. Two lookups rather than embeds:
     pos_expenses points at pos_staff twice — who recorded it and who approved
     it — and an unqualified embed is ambiguous, which PostgREST refuses. */
  const staffIds = Array.from(
    new Set(
      rows.flatMap((r) =>
        [r.staff_uuid, r.approved_by].filter(Boolean).map((v) => String(v)),
      ),
    ),
  );
  const shiftIds = Array.from(
    new Set(rows.map((r) => r.shift_id).filter(Boolean).map((v) => String(v))),
  );

  const [staffRes, shiftRes] = await Promise.all([
    staffIds.length
      ? supabaseAdminLive.from("pos_staff").select("id, name, staff_id").in("id", staffIds)
      : Promise.resolve({ data: [] }),
    shiftIds.length
      ? supabaseAdminLive
          .from("pos_shifts")
          .select("id, shift_label, business_date")
          .in("id", shiftIds)
      : Promise.resolve({ data: [] }),
  ]);

  const names = new Map<string, string>();
  for (const raw of (staffRes.data ?? []) as { id: string; name: string; staff_id: string }[]) {
    names.set(raw.id, raw.name || raw.staff_id);
  }
  const shifts = new Map<string, { label: string; date: string }>();
  for (const raw of (shiftRes.data ?? []) as {
    id: string;
    shift_label: string;
    business_date: string;
  }[]) {
    shifts.set(raw.id, { label: raw.shift_label ?? "", date: raw.business_date ?? "" });
  }

  const byCategory = new Map<string, { category: string; count: number; total: number }>();
  const byMethod = { cash: 0, card: 0, transfer: 0 };
  let total = 0;
  /* The VAT already inside the ones marked as carrying it. Not added on top —
     a supplier's invoice in the UAE is quoted inclusive, the same way a menu
     price is, so this only names the portion that is reclaimable. */
  let vat = 0;

  const expenses = rows.map((row) => {
    const amount = num(row.amount);
    const method = String(row.payment_method ?? "cash").trim().toLowerCase();
    const category = String(row.category ?? "").trim() || "Uncategorised";
    const shift = row.shift_id ? shifts.get(String(row.shift_id)) : undefined;
    const vatIncluded = row.vat_included === true;

    total += amount;
    if (vatIncluded) vat += vatIncludedIn(amount);
    if (method === "card") byMethod.card += amount;
    else if (method === "transfer") byMethod.transfer += amount;
    else byMethod.cash += amount;

    const cat = byCategory.get(category) ?? { category, count: 0, total: 0 };
    cat.count += 1;
    cat.total += amount;
    byCategory.set(category, cat);

    return {
      id: String(row.id),
      spentAt: String(row.spent_at ?? ""),
      /* The trading day it came off, from the shift that paid it. Falls back to
         the day the money left, for an expense recorded against no shift. */
      businessDate: shift?.date || businessDateFor(new Date(String(row.spent_at))),
      shiftLabel: shift?.label ?? "",
      staff: row.staff_uuid ? names.get(String(row.staff_uuid)) ?? "" : "",
      category,
      description: String(row.description ?? ""),
      supplier: String(row.supplier ?? ""),
      reference: String(row.reference ?? ""),
      amount,
      method,
      vatIncluded,
      /* Blank means nobody who could approve it was signed in — which is only
         possible below the manager threshold, and is worth being able to see. */
      approvedBy: row.approved_by ? names.get(String(row.approved_by)) ?? "" : "",
      receiptUrl: String(row.receipt_url ?? ""),
      note: String(row.note ?? ""),
    };
  });

  return NextResponse.json({
    from,
    to,
    totals: {
      count: expenses.length,
      total: roundMoney(total),
      /* Only cash actually came out of a drawer. A card or transfer payment is
         a real cost and never touched the till, which is why the shift close
         deducts one and not the other. */
      cash: roundMoney(byMethod.cash),
      card: roundMoney(byMethod.card),
      transfer: roundMoney(byMethod.transfer),
      vat: roundMoney(vat),
      unapproved: expenses.filter((e) => !e.approvedBy).length,
    },
    byCategory: Array.from(byCategory.values())
      .map((c) => ({ ...c, total: roundMoney(c.total) }))
      .sort((a, b) => b.total - a.total),
    expenses,
  });
}
