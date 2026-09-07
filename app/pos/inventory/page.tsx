import { requirePermission } from "@/lib/pos/guard";
import InventoryScreen from "./InventoryScreen";

export const dynamic = "force-dynamic";

/**
 * Counting the shelves needs a login, not an open drawer.
 *
 * requirePermission rather than requireShift: the stock is counted before
 * service starts and after it ends, and making somebody open a till they will
 * not take a penny through — and then reconcile it — to write down how many
 * cans are in the fridge is how the count stops being done.
 */
export default async function InventoryPage() {
  const staff = await requirePermission("inventory");
  return <InventoryScreen staff={staff} />;
}
