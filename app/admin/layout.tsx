import type { Metadata, Viewport } from "next";
import AdminShell from "./AdminShell";

/**
 * The admin panel installs as its own app.
 *
 * A browser decides what it is installing from the manifest linked by the page
 * in front of it, so pointing these pages at a second manifest — different id,
 * name, icons and a scope of /admin — is what makes "add to home screen" here
 * produce an admin app rather than another copy of the customer site. The two
 * then sit side by side, the admin one dark where the customer one is white.
 *
 * The manifest itself lives at the site root rather than under /admin: the
 * browser fetches it before anyone has signed in, and middleware would bounce
 * it back to the login page.
 */
export const metadata: Metadata = {
  title: {
    default: "Two In One Admin",
    template: "%s · Two In One Admin",
  },
  manifest: "/admin-app.webmanifest",
  icons: {
    icon: "/icons/admin-icon-192.png",
    apple: "/icons/admin-apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    // What iOS writes under the home-screen icon.
    title: "TIO Admin",
    statusBarStyle: "black-translucent",
  },
  // An admin panel has no business in search results.
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
