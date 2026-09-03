import { requireShift } from "@/lib/pos/guard";
import { getPosMenu } from "@/lib/pos/menu-server";
import TillScreen from "./TillScreen";

export const dynamic = "force-dynamic";

export default async function TillPage() {
  const { staff, stale } = await requireShift();
  const { settings, categories, items } = await getPosMenu();

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
