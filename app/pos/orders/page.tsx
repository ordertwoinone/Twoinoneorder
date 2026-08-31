import { requireShift } from "@/lib/pos/guard";
import { staleShifts } from "@/lib/pos/shift-server";
import OrdersScreen from "./OrdersScreen";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { staff } = await requireShift();
  return <OrdersScreen staff={staff} stale={await staleShifts()} />;
}
