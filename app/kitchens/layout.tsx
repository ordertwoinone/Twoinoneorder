import type { Metadata, Viewport } from "next";

/*
 * Installs as its own app. A browser decides what it is installing from the
 * manifest linked by the page in front of it, so without this the page would
 * install the customer site instead.
 */
export const metadata: Metadata = {
  manifest: "/kitchens-app.webmanifest",
  icons: {
    icon: "/icons/kitchens-icon-192.png",
    apple: "/icons/kitchens-apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "TIO Kitchens",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#b71c24",
};

export default function KitchensLayout({ children }: { children: React.ReactNode }) {
  return children;
}
