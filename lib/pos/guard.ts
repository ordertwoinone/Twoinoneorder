import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/pos/auth";
import { closableShifts, openShiftFor, shiftById, staleShifts } from "@/lib/pos/shift-server";
import type { ClosableShift, PosShift, StaleShift } from "@/lib/pos/shift";
import type { PosStaff } from "@/lib/pos/constants";
import { can, landingFor, type PosPermission } from "@/lib/pos/permissions";

/**
 * The three-line preamble every till page needs: signed in, allowed in, and on
 * a shift.
 *
 * Written once because getting it wrong on one page is a screen that takes
 * money outside a shift, and every figure the day close reconciles is grouped
 * by shift.
 *
 * Every guard here takes the permission the page stands behind, because a rail
 * that hides a button is decoration — someone who types the URL, or comes back
 * to a bookmarked tab after their access changed, arrives at the page itself.
 */

/** Signed in, and allowed to open this screen. Nothing about cash. */
export async function requirePermission(key: PosPermission): Promise<PosStaff> {
  const staff = await currentStaff();
  if (!staff) redirect("/pos/login");

  if (!can(staff, key)) {
    /* Sent to whatever they can open rather than shown a wall. Somebody who has
       had one screen withdrawn is still here to work, and the rail will not be
       showing them this button anyway — arriving at all means a stale tab or a
       typed URL, and the useful answer to both is the screen they do have. */
    const home = landingFor(staff);
    redirect(home && home !== "/pos" ? home : "/pos/no-access");
  }

  return staff;
}

export async function requireShift(key: PosPermission = "till"): Promise<{
  staff: PosStaff;
  shift: PosShift;
  stale: StaleShift[];
}> {
  const staff = await requirePermission(key);

  /* Kitchen has no drawer and so no shift. Sending them to count one would be
     asking a cook to reconcile a float they will never touch — and they would
     be stuck there, because they cannot open a till either. */
  if (staff.role === "kitchen") redirect("/pos/kitchen");

  /* Fetched together. These were three round trips in a row on every single
     navigation — the session, then the shift, then the warning — and on a
     tablet over café wifi that is most of the wait between tapping the rail
     and the screen changing. The session has to come first because the other
     two need who is asking; those two do not need each other. */
  const [shift, stale] = await Promise.all([openShiftFor(staff.id), staleShifts()]);
  if (!shift) redirect("/pos/shift/open");

  return { staff, shift, stale };
}

/**
 * The shift-close screen, which is the one screen that can be here for a drawer
 * that is not the caller's own.
 *
 * requireShift() sends anybody without an open shift off to open one, and for
 * every other till screen that is right — there is nothing to sell from and
 * nothing to count. It is wrong here in exactly the case this screen exists
 * for: a cashier walked out on Friday without closing, and the manager who
 * comes in to clear it up has no open drawer of their own, so the screen that
 * could fix it was the one screen they could not reach.
 *
 * So: their own drawer if they have one, and otherwise — for a manager — the
 * oldest one anybody left open, because that is the one that has gone
 * unreconciled longest. Only when there is neither does it fall back to the old
 * answer of sending them to open a shift.
 */
export async function requireCloseTarget(): Promise<{
  staff: PosStaff;
  shift: PosShift;
  closable: ClosableShift[];
  stale: StaleShift[];
}> {
  const staff = await requirePermission("shift_close");
  if (staff.role === "kitchen") redirect("/pos/kitchen");

  const [mine, allOpen, stale] = await Promise.all([
    openShiftFor(staff.id),
    closableShifts(staff.id),
    staleShifts(),
  ]);

  /* Closing your own drawer is a cashier's job. Closing somebody else's is
     signing your name to takings you did not handle, which is a manager's —
     the same rule the stale-shift banner has always stated in words. */
  const offered = can(staff, "day_close") ? allOpen : allOpen.filter((s) => s.mine);

  // Oldest first out of closableShifts(), so [0] is the longest-abandoned.
  const target = mine ?? (offered.length > 0 ? await shiftById(offered[0].id) : null);
  if (!target) redirect("/pos/shift/open");

  return { staff, shift: target, closable: offered, stale };
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
