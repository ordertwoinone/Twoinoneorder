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
