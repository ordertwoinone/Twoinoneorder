import type { MetadataRoute } from "next";

// Web App Manifest — makes the site installable as a standalone PWA.
// Branding/colors are intentionally the existing identity (orange #ea580c on white).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Two In One UAE — Restaurants, Buffet & Catering",
    short_name: "Two In One",
    description:
      "Order food, enjoy the buffet, book a table or arrange catering near University City, Kalba.",
    id: "/",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ea580c",
    lang: "en-AE",
    dir: "ltr",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Offers", short_name: "Offers", url: "/offers" },
      { name: "Book a Table", short_name: "Book", url: "/book-table" },
      { name: "Buffet Menu", short_name: "Buffet", url: "/restaurant/buffet" },
    ],
  };
}
