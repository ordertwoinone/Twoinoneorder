import type { Metadata } from "next";
import { Inter, Dancing_Script } from "next/font/google";
import "./globals.css";
import { supabaseAdmin } from "@/lib/supabase-admin";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const dancing = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-dancing",
  weight: ["700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("site_name, tagline, og_image_url, favicon_url")
    .single();

  const siteName = data?.site_name || "Two In One UAE";
  const tagline = data?.tagline || "4 Restaurants. One Destination.";
  const ogImage = data?.og_image_url || undefined;
  const favicon = data?.favicon_url || "/two-in-one.ico";

  return {
    title: `${siteName} — Food Delivery Platform`,
    description: `Order from UAE's top restaurants. ${tagline}`,
    keywords: "food delivery UAE, karak Dubai, falafel Dubai, catering UAE",
    icons: {
      icon: favicon,
      shortcut: favicon,
    },
    openGraph: {
      title: siteName,
      description: tagline,
      type: "website",
      ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630 }] }),
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} ${dancing.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
