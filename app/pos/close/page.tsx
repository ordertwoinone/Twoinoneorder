import { requireCloseTarget } from "@/lib/pos/guard";
import ShiftCloseScreen from "./ShiftCloseScreen";

export const dynamic = "force-dynamic";

/**
 * Closing one drawer. The restaurant's day is signed off at /pos/day-close.
 *
 * Behind "shift_close" rather than a role, so a trusted cashier can hand over
 * at four without being made a manager to do it. The guard also lets a manager
 * in with no drawer of their own, to close one somebody else abandoned — see
 * requireCloseTarget().
 */
export default async function ShiftClosePage() {
  const { staff, shift, closable, stale } = await requireCloseTarget();
  return <ShiftCloseScreen staff={staff} shift={shift} closable={closable} stale={stale} />;
}
