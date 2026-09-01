import type { Metadata } from "next";
import { getKioskData, getKioskDevice } from "@/lib/kiosk/server";
import { toDeviceSlug } from "@/lib/kiosk/types";
import KioskApp from "../KioskApp";

/**
 * One named panel: /kiosk/counter-1.
 *
 * The slug is how a screen knows which it is, set once when the panel is
 * installed by pinning its browser to this address. There is nothing to sign in
 * to and so nothing that can expire and leave a password prompt facing the
 * queue — see supabase/kiosk_devices.sql for why that shape was chosen.
 *
 * An unrecognised slug still sells food. It renders exactly as the unnamed
 * kiosk does, and the order goes down without a device against it, because a
 * screen that refuses to serve anyone over a typo is the worse failure.
 */
export const dynamic = "force-dynamic";

/**
 * Each panel installs as its own app, pointing at its own address.
 *
 * The manifest is a route rather than a static file precisely so start_url can
 * carry the slug: install this page to a home screen and the tile reopens this
 * panel, not the unnamed kiosk. Without it every installed screen would launch
 * /kiosk and stop identifying itself the first time somebody used the icon
 * instead of the browser.
 */
export function generateMetadata({ params }: { params: { device: string } }): Metadata {
  const slug = toDeviceSlug(params.device);
  return {
    manifest: slug ? `/kiosk-app.webmanifest?device=${slug}` : "/kiosk-app.webmanifest",
  };
}

export default async function KioskDevicePage({ params }: { params: { device: string } }) {
  const [data, device] = await Promise.all([
    getKioskData(),
    getKioskDevice(params.device),
  ]);

  return <KioskApp initial={data} device={device} />;
}
