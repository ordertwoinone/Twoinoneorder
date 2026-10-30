import { NextResponse } from "next/server";

/**
 * The kitchens page's own web app manifest, so it installs as a separate app
 * from the customer site: its own name, icon and home-screen tile, opening
 * straight on /kitchens. `id` is what keeps the two apart, as Chrome keys an
 * installed app on it.
 */
export function GET() {
  return NextResponse.json(
    {
      id: "/kitchens-app",
      name: "Two In One Kitchens",
      short_name: "TIO Kitchens",
      description: "Order from the Italian and Turkish kitchens at Two In One.",
      start_url: "/kitchens?source=pwa",
      scope: "/kitchens",
      display: "standalone",
      background_color: "#f7f5ef",
      theme_color: "#b71c24",
      lang: "en-AE",
      dir: "ltr",
      categories: ["food"],
      prefer_related_applications: false,
      icons: [
        { src: "/icons/kitchens-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/kitchens-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/kitchens-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/icons/kitchens-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
