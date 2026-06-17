import type { Metadata } from "next";
import { Inter, Dancing_Script } from "next/font/google";
import "./globals.css";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { FavoritesProvider } from "@/lib/favorites/FavoritesContext";
import JsonLd from "@/components/seo/JsonLd";
import TrackingScripts from "@/components/seo/TrackingScripts";
import { SITE_URL, organizationSchema, webSiteSchema } from "@/lib/seo";

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

  const defaultTitle = `${siteName} — Order Food, Buffet, Catering & Table Booking in Kalba`;
  const description = `Order karak, falafel, snacks & bakery, enjoy the buffet, book a table or arrange catering near University City, Kalba. ${tagline}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: defaultTitle,
      template: `%s | ${siteName}`,
    },
    description,
    applicationName: siteName,
    keywords: [
      "Two In One",
      "Two In One Kalba",
      "restaurants University City Kalba",
      "food delivery Kalba",
      "buffet Kalba Sharjah",
      "karak near me",
      "falafel Kalba",
      "catering Sharjah UAE",
      "book a table Kalba",
      "student deals Kalba",
    ],
    alternates: { canonical: "/" },
    icons: { icon: favicon, shortcut: favicon, apple: favicon },
    formatDetection: { telephone: true, email: true, address: true },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: defaultTitle,
      description,
      type: "website",
      url: SITE_URL,
      siteName,
      locale: "en_AE",
      ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630, alt: siteName }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;

async function getSameAs(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("facebook_url, instagram_url, twitter_url, tiktok_url")
    .single();
  return [data?.facebook_url, data?.instagram_url, data?.twitter_url, data?.tiktok_url].filter(
    Boolean,
  ) as string[];
}

async function getTracking() {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("meta_pixel_id, ga_measurement_id, gtm_id, head_scripts")
    .single();
  return data;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [sameAs, tracking] = await Promise.all([getSameAs(), getTracking()]);

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {supabaseOrigin && (
          <>
            <link rel="preconnect" href={supabaseOrigin} />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        )}
        <JsonLd data={[organizationSchema(sameAs), webSiteSchema()]} />
      </head>
      <body className={`${inter.className} ${dancing.variable} antialiased`}>
        <TrackingScripts
          metaPixelId={tracking?.meta_pixel_id}
          gaMeasurementId={tracking?.ga_measurement_id}
          gtmId={tracking?.gtm_id}
          headScripts={tracking?.head_scripts}
        />
        <FavoritesProvider>{children}</FavoritesProvider>
      </body>
    </html>
  );
}
