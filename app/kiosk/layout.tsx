import type { Metadata, Viewport } from "next";

/**
 * The self-order kiosk screen.
 *
 * It runs outside the rest of the site's chrome — no navbar, no footer, no
 * bottom nav — because it is not a page someone browsed to. It is the whole of
 * what a display standing in the branch shows, all day, to whoever walks up.
 *
 * The panel is portrait, so everything below is built for a tall screen and
 * fills whatever it is given: 1080 × 1920 is what it was drawn for. The rules
 * that make it behave like a fixed public screen rather than a web page live in
 * globals.css under `.kiosk-root`.
 */
export const metadata: Metadata = {
  title: "Order Here",
  // A screen in a room has no business in search results.
  robots: { index: false, follow: false, nocache: true },

  /*
   * The kiosk installs as its own app.
   *
   * A browser decides what it is installing from the manifest linked by the
   * page in front of it, so without this a panel added to a home screen would
   * install the customer site — same name, same icon, opening the storefront
   * rather than the ordering screen. A named panel overrides this with its own
   * slug so the tile opens that panel; see [device]/page.tsx.
   */
  manifest: "/kiosk-app.webmanifest",
  icons: {
    icon: "/icons/kiosk-icon-192.png",
    apple: "/icons/kiosk-apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Order Here",
    /* black-translucent hands the status bar's space to the page, which is
       what a kiosk wants: the ad should run to the top of the glass. */
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // A kiosk that can be pinch-zoomed is a kiosk left zoomed in by a passer-by.
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0B0B0B",
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  /*
   * The kiosk pins its own direction rather than inheriting the site's.
   *
   * LocaleScript stamps lang/dir on <html> from the visitor's browser, which is
   * right for the website — but a kiosk is not a visitor. The panels are
   * Android tablets, and a tablet set to Arabic was serving an English kiosk
   * laid out right-to-left: the stepper ran backwards, the keypad read 3-2-1,
   * and every logical margin in the build flipped. The screen renders English
   * copy, so it declares English here. When the language toggle is wired up it
   * will set this from the kiosk's own choice, not from the device's.
   */
  return (
    <div className="kiosk-root" dir="ltr" lang="en">
      {children}
    </div>
  );
}
