import { requireShift } from "@/lib/pos/guard";
import OrdersScreen from "./OrdersScreen";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { staff, stale } = await requireShift("orders");
  return <OrdersScreen staff={staff} stale={stale} />;
}
