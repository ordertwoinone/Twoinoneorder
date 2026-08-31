import { requireShift } from "@/lib/pos/guard";
import { staleShifts } from "@/lib/pos/shift-server";
import { getPosMenu } from "@/lib/pos/menu-server";
import TillScreen from "./TillScreen";

export const dynamic = "force-dynamic";

export default async function TillPage() {
  const { staff } = await requireShift();

  const [{ settings, categories, items }, stale] = await Promise.all([getPosMenu(), staleShifts()]);

  return (
    <TillScreen
      staff={staff}
      settings={settings}
      categories={categories}
      items={items}
      stale={stale}
    />
  );
}
