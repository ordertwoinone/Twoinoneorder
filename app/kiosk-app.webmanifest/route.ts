import { NextResponse } from "next/server";
import { toDeviceSlug } from "@/lib/kiosk/types";

/**
 * The kiosk's own web app manifest.
 *
 * A route rather than a file in public/, because a manifest's start_url is
 * fixed and a branch runs several panels. Each one is installed from
 * /kiosk-app.webmanifest?device=counter-1, which comes back naming that
 * screen — so the tile on that panel opens the panel it belongs to, and the
 * orders it takes carry its name. Without that every installed kiosk would
 * launch the unnamed /kiosk and the device identity would be lost the moment
 * anybody used the home-screen icon rather than the browser.
 *
 * `id` varies with the device too. Chrome keys an installed app on its id, so
 * two panels sharing one would be treated as the same app if they were ever
 * set up from the same tablet.
 */
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const slug = toDeviceSlug(new URL(request.url).searchParams.get("device"));
  const path = slug ? `/kiosk/${slug}` : "/kiosk";
  const label = slug ? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

  return NextResponse.json(
    {
      id: slug ? `/kiosk-app-${slug}` : "/kiosk-app",
      name: label ? `Two In One Order — ${label}` : "Two In One Order Kiosk",
      short_name: label || "Order Here",
      description: "Self-order screen for Two In One, University Kalba.",

      /* source=pwa so the analytics can tell a panel launched from its own icon
         from one somebody opened in a browser tab. */
      start_url: `${path}?source=pwa`,
      /* Scoped to the whole of /kiosk rather than the one device, so a panel
         does not leave its app window if the slug is ever changed. */
      scope: "/kiosk",

      /* Fullscreen, not standalone. A kiosk should not show the Android status
         bar or a title bar — the panel is the application. */
      display: "fullscreen",
      display_override: ["fullscreen", "standalone"],
      orientation: "portrait",

      background_color: "#0B0B0B",
      theme_color: "#0B0B0B",
      lang: "en-AE",
      dir: "ltr",
      categories: ["food", "business"],
      prefer_related_applications: false,

      icons: [
        { src: "/icons/kiosk-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/kiosk-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/kiosk-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/icons/kiosk-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        // Short, so renaming a screen reaches the panel without a reinstall.
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
