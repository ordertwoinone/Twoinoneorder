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

  const shift = await openShiftFor(staff.id);
  if (!shift) redirect("/pos/shift/open");

  return { staff, shift };
}
