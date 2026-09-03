import { requireShift } from "@/lib/pos/guard";
import ShiftCloseScreen from "./ShiftCloseScreen";

export const dynamic = "force-dynamic";

/**
 * Closing one drawer. The restaurant's day is signed off at /pos/day-close.
 *
 * Behind requireShift() because there is nothing to count without one — and
 * behind "shift_close" rather than a role, so a trusted cashier can hand over
 * at four without being made a manager to do it.
 */
export default async function ShiftClosePage() {
  const { staff, shift, stale } = await requireShift("shift_close");
  return <ShiftCloseScreen staff={staff} shift={shift} stale={stale} />;
}
