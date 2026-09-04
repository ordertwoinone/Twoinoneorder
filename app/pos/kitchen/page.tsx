import type { Metadata } from "next";
import { requirePermission } from "@/lib/pos/guard";
import OrdersScreen from "../orders/OrdersScreen";

export const dynamic = "force-dynamic";

/**
 * The pass installs as its own app, separate from the till's.
 *
 * A screen over the pass and a tablet on the counter are two devices doing two
 * jobs, and one of them should never land on a drawer. Installing from here
 * gives a tile that opens the kitchen board and an app id of its own, so
 * setting both up from the same tablet does not have Chrome treat them as the
 * same app and overwrite one with the other.
 */
export const metadata: Metadata = {
  title: "Kitchen",
  manifest: "/pos-app.webmanifest?screen=kitchen",
};

/**
 * The kitchen view is the order board with the finished work taken out.
 *
 * The same component rather than a second one: a kitchen screen that drifts
 * apart from the board staff are working is worse than one that is plainer
 * than it might be.
 */
export default async function KitchenPage() {
  const staff = await requirePermission("kitchen");
  return <OrdersScreen staff={staff} kitchenOnly />;
}
