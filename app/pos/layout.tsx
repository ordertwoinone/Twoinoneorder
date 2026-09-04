import type { Metadata, Viewport } from "next";

/**
 * The till.
 *
 * Its own section of the site, behind its own login, with none of the customer
 * chrome. Staff sign in with an ID and a PIN — see lib/pos/auth.ts for why that
 * shape rather than a password, and what carries the weight instead.
 *
 * The guard is per page rather than in middleware: checking a session means
 * hashing a token and reading a row, and middleware runs on the edge runtime
 * where neither is available.
 */
export const metadata: Metadata = {
  title: "Two In One POS",
  robots: { index: false, follow: false, nocache: true },

  /*
   * The till installs as its own app.
   *
   * A browser decides what it is installing from the manifest linked by the
   * page in front of it, so without this a counter tablet added to a home
   * screen would install the customer site — the storefront's name, the
   * storefront's icon, opening the storefront. The kitchen board overrides
   * this with its own screen so its tile opens the pass; see kitchen/page.tsx.
   */
  manifest: "/pos-app.webmanifest",
  icons: {
    icon: "/icons/pos-icon-192.png",
    apple: "/icons/pos-apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    // What iOS writes under the home-screen icon.
    title: "POS",
    /* Not "black-translucent". That hands the status bar's space to the page,
       and the till's own header — the screen title and the signed-in name —
       would be drawn under the clock. A staff tool wants the status bar
       visible and out of the way, not overlapping the chrome. */
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0E3A3F",
};

export default function PosLayout({ children }: { children: React.ReactNode }) {
  // Landscape tablets, and the same reasons the kiosk pins its direction: the
  // till is English-only for now, and a device set to Arabic would mirror it.
  return (
    <div className="pos-root" dir="ltr" lang="en">
      {children}
    </div>
  );
}
