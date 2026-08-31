import { requireStaff } from "@/lib/pos/guard";
import OrdersScreen from "../orders/OrdersScreen";

export const dynamic = "force-dynamic";

/**
 * The kitchen view is the order board with the finished work taken out.
 *
 * The same component rather than a second one: a kitchen screen that drifts
 * apart from the board staff are working is worse than one that is plainer
 * than it might be.
 */
export default async function KitchenPage() {
  const staff = await requireStaff();
  return <OrdersScreen staff={staff} kitchenOnly />;
}
