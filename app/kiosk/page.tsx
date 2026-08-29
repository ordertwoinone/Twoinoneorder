import { getKioskData } from "@/lib/kiosk/server";
import KioskApp from "./KioskApp";

/**
 * The unnamed kiosk.
 *
 * A branch running one panel needs nothing more than this, and it stays working
 * for a screen whose device has not been registered yet. Orders from here carry
 * no device, which reads as "Kiosk" on the board rather than as a screen that
 * has gone missing. Several panels get one URL each — see [device]/page.tsx.
 */
export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const data = await getKioskData();
  return <KioskApp initial={data} device={null} />;
}
