import { requirePermission } from "@/lib/pos/guard";
import DayCloseScreen from "./DayCloseScreen";

export const dynamic = "force-dynamic";

/**
 * Closing the restaurant's day, as opposed to one drawer (/pos/close).
 *
 * Not behind requireShift(). A manager coming in at the end of the evening to
 * sign the day off has no drawer of their own and should not be made to count
 * one — and the shifts they are signing off are, by definition, other people's.
 */
export default async function DayClosePage() {
  const staff = await requirePermission("day_close");
  return <DayCloseScreen staff={staff} />;
}
