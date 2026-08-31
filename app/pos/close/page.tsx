import { requireShift } from "@/lib/pos/guard";
import { staleShifts } from "@/lib/pos/shift-server";
import DayCloseScreen from "./DayCloseScreen";

export const dynamic = "force-dynamic";

export default async function DayClosePage() {
  const { staff, shift } = await requireShift();
  return <DayCloseScreen staff={staff} shift={shift} stale={await staleShifts()} />;
}
