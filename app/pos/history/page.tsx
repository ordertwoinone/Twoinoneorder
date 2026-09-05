import { requirePermission } from "@/lib/pos/guard";
import HistoryScreen from "./HistoryScreen";

export const dynamic = "force-dynamic";

/**
 * Behind "orders" rather than a shift.
 *
 * Looking up what happened last Tuesday is not something you should have to
 * count a float to do — a manager arriving to answer a customer's query has no
 * drawer open and no reason to open one.
 */
export default async function HistoryPage() {
  const staff = await requirePermission("orders");
  return <HistoryScreen staff={staff} />;
}
