import { requireShift } from "@/lib/pos/guard";
import ReportsScreen from "./ReportsScreen";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { staff } = await requireShift("reports");
  return <ReportsScreen staff={staff} />;
}
