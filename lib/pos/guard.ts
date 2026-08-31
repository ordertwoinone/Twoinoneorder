import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/pos/auth";
import { openShiftFor } from "@/lib/pos/shift-server";
import type { PosShift } from "@/lib/pos/shift";
import type { PosStaff } from "@/lib/pos/constants";

/**
 * The three-line preamble every till page needs: signed in, and on a shift.
 *
 * Written once because getting it wrong on one page is a screen that takes
 * money outside a shift, and every figure the day close reconciles is grouped
 * by shift.
 */
export async function requireShift(): Promise<{ staff: PosStaff; shift: PosShift }> {
  const staff = await currentStaff();
  if (!staff) redirect("/pos/login");

  /* Kitchen has no drawer and so no shift. Sending them to count one would be
     asking a cook to reconcile a float they will never touch — and they would
     be stuck there, because they cannot open a till either. */
  if (staff.role === "kitchen") redirect("/pos/kitchen");

  const shift = await openShiftFor(staff.id);
  if (!shift) redirect("/pos/shift/open");

  return { staff, shift };
}

/**
 * Signed in, and that is all.
 *
 * For screens that do not touch cash — the kitchen board, and printing a
 * receipt for an order somebody else rang up.
 */
export async function requireStaff(): Promise<PosStaff> {
  const staff = await currentStaff();
  if (!staff) redirect("/pos/login");
  return staff;
}
