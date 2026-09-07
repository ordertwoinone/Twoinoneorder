import { NextResponse } from "next/server";
import { currentStaff } from "@/lib/pos/auth";
import { can } from "@/lib/pos/permissions";
import type { PosStaff } from "@/lib/pos/constants";

/**
 * The preamble every stock route shares: signed in, and allowed near the stock.
 *
 * The rail already hides Inventory from an account that cannot open it, but a
 * hidden button is not a locked door — a stale tab or a typed URL arrives at
 * the route itself, and these routes write off value.
 */
export async function inventoryStaff(): Promise<
  { staff: PosStaff; deny: null } | { staff: null; deny: NextResponse }
> {
  const staff = await currentStaff();
  if (!staff) {
    return { staff: null, deny: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }
  if (!can(staff, "inventory")) {
    return {
      staff: null,
      deny: NextResponse.json({ error: "You are not set up for stock control" }, { status: 403 }),
    };
  }
  return { staff, deny: null };
}

/** How a movement or a count records who keyed it in. */
export function enteredBy(staff: PosStaff): string {
  return staff.name || staff.staff_id;
}

/** A number out of a JSON body, floored at zero unless negatives are wanted. */
export function amount(value: unknown, opts: { signed?: boolean } = {}): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n * 1000) / 1000;
  return opts.signed ? rounded : Math.max(0, rounded);
}

/** YYYY-MM-DD, or today when the caller sends something that is not a date. */
export function safeDate(value: unknown): string {
  const raw = String(value ?? "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function text(value: unknown, max = 200): string {
  return String(value ?? "").trim().slice(0, max);
}
