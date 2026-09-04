import { NextResponse } from "next/server";

/**
 * The till's own web app manifest.
 *
 * Without one, a tablet added to its home screen installs the customer site: a
 * browser decides what it is installing from the manifest linked by the page in
 * front of it, and /pos was linking the site's. The tile came out with the
 * storefront's name and icon and opened the storefront — which on a counter
 * tablet with a queue in front of it is worse than no icon at all.
 *
 * A route rather than a file in public/, for the same reason the kiosk's is
 * one: a manifest's start_url is fixed, and the branch runs more than one kind
 * of screen off this app. The counter tablet wants the till; the screen over
 * the pass wants the kitchen board and should never land on a drawer it has no
 * business opening. Each installs from /pos-app.webmanifest?screen=kitchen and
 * gets a manifest naming that screen.
 *
 * It lives at the site root rather than under /pos, like the admin one and for
 * the same reason: the browser fetches a manifest before anybody has signed in.
 *
 * `id` varies with the screen too. Chrome keys an installed app on its id, so
 * a till and a kitchen board set up from the same tablet would otherwise be
 * treated as the same app and overwrite each other.
 */
export const dynamic = "force-dynamic";

/**
 * The screens worth installing as an app of their own.
 *
 * Not every page on the rail. A screen earns a place here by being the whole
 * job of a device that sits somewhere and does one thing all day — which is
 * true of the counter and the pass, and true of nothing else: nobody mounts a
 * tablet to the wall to look at Reports.
 */
const SCREENS: Record<string, { path: string; name: string; short: string; scope: string }> = {
  till: {
    path: "/pos/till",
    name: "Two In One POS",
    short: "POS",
    /* Scoped to the whole of /pos, not to the till. A cashier moving to the
       order board or the day close must stay inside the app window — a scope of
       /pos/till would hand them back to a browser tab halfway through a shift.
       It also means a session that expires can still reach /pos/login. */
    scope: "/pos",
  },
  kitchen: {
    path: "/pos/kitchen",
    name: "Two In One Kitchen",
    short: "Kitchen",
    scope: "/pos",
  },
};

const DEFAULT = {
  path: "/pos",
  name: "Two In One POS",
  short: "POS",
  scope: "/pos",
};

export function GET(request: Request) {
  const asked = (new URL(request.url).searchParams.get("screen") ?? "").trim().toLowerCase();
  const screen = SCREENS[asked] ?? DEFAULT;
  const suffix = SCREENS[asked] ? `-${asked}` : "";

  return NextResponse.json(
    {
      id: `/pos-app${suffix}`,
      name: screen.name,
      short_name: screen.short,
      description: "Till, order board and kitchen screen for Two In One, University Kalba.",

      /* source=pwa so a screen launched from its own icon can be told apart
         from one somebody opened in a browser tab. */
      start_url: `${screen.path}?source=pwa`,
      scope: screen.scope,

      /* standalone, not fullscreen — the one place this deliberately differs
         from the kiosk. A kiosk is customer-facing and the panel is the whole
         application, so the status bar is clutter. A till is a staff tool, and
         the wifi symbol, the battery and the clock are things the person
         working it genuinely needs: an order that failed to send and a tablet
         about to die both show up there first. */
      display: "standalone",
      display_override: ["standalone", "minimal-ui"],

      /* Landscape. The till is drawn for a 1366×1024 tablet lying down (see
         POS_CANVAS in lib/pos/theme.ts) and the rail plus a three-column day
         close do not fit any other way. */
      orientation: "landscape",

      background_color: "#0E3A3F",
      theme_color: "#0E3A3F",
      lang: "en-AE",
      dir: "ltr",
      categories: ["business", "productivity", "food"],
      prefer_related_applications: false,

      icons: [
        { src: "/icons/pos-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/pos-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/pos-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/icons/pos-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],

      /* Long-press the icon. Only the screens somebody jumps to mid-shift —
         nothing here that ends a shift or signs the day off, because those are
         not things to reach by accident from a home screen. */
      shortcuts: [
        { name: "Take an order", short_name: "Till", url: "/pos/till" },
        { name: "Order board", short_name: "Orders", url: "/pos/orders" },
        { name: "Kitchen", short_name: "Kitchen", url: "/pos/kitchen" },
        { name: "Item availability", short_name: "Stock", url: "/pos/availability" },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        // Short, so a change here reaches an installed tablet without a reinstall.
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
