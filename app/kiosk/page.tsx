import { getKioskData } from "@/lib/kiosk/server";
import KioskApp from "./KioskApp";

/**
 * Rendered on the server so the panel paints a finished screen the moment it
 * boots, rather than a spinner in front of the shop. From then on the app
 * re-reads /api/kiosk/menu each time it falls back to idle, so it keeps up with
 * the menu without anyone touching it.
 */
export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const data = await getKioskData();
  return <KioskApp initial={data} />;
}
