import { requireShift } from "@/lib/pos/guard";
import ExpensesScreen from "./ExpensesScreen";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const { staff, shift } = await requireShift();
  return <ExpensesScreen staff={staff} openingFloat={Number(shift.opening_float)} />;
}
