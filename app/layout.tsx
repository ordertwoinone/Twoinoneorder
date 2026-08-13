import type { Metadata, Viewport } from "next";
import { Inter, Dancing_Script, Outfit, Cairo } from "next/font/google";
import "./globals.css";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { FavoritesProvider } from "@/lib/favorites/FavoritesContext";
import JsonLd from "@/components/seo/JsonLd";
import TrackingScripts from "@/components/seo/TrackingScripts";
import PwaProvider from "@/components/pwa/PwaProvider";
import SplashScreen from "@/components/ui/SplashScreen";
import { SITE_URL, organizationSchema, webSiteSchema } from "@/lib/seo";
import { FALLBACK_LOGO, FALLBACK_SITE_NAME } from "@/lib/branding";
import { getSiteFlags } from "@/lib/site-flags";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import LocaleScript from "@/lib/i18n/LocaleScript";
import { DEFAULT_LOCALE, LOCALE_META, LOCALES } from "@/lib/i18n/config";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const dancing = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-dancing",
  weight: ["700"],
  display: "swap",
});
// Header wordmark only — kept off the body so it costs one small file.
const brand = Outfit({
  subsets: ["latin"],
  variable: "--font-brand",
  weight: ["600", "800"],
  display: "swap",
});
// Arabic body face. Latin stays on Inter — globals.css only swaps the family in
// when <html lang> is "ar", so the English design is byte-for-byte unchanged.
const arabic = Cairo({
  subsets: ["arabic"],
  variable: "--font-ar",
  weight: ["400", "600", "700", "800"],
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
    // hreflang is *not* declared here: Next strips the query string from
    // `alternates.languages`, and any page that sets its own `alternates`
    // replaces the inherited block wholesale. It is declared in two places that
    // do work — app/sitemap.ts for crawlers, and I18nProvider for the rendered
    // DOM, both pointing at `?lang=` URLs.
    alternates: { canonical: "/" },
    /* Explicit rather than the app/manifest.ts convention: that one is injected
       into every page in the app, admin included, and a nested layout cannot
       override it — which is exactly what the admin panel needs to do to
       install as its own app. */
    manifest: "/manifest.webmanifest",
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: "/icons/apple-touch-icon.png",
    },
    appleWebApp: {
      capable: true,
      title: siteName,
      statusBarStyle: "default",
    },
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
      locale: LOCALE_META[DEFAULT_LOCALE].ogLocale,
      alternateLocale: LOCALES.filter((code) => code !== DEFAULT_LOCALE).map(
        (code) => LOCALE_META[code].ogLocale,
      ),
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

// Drives the browser/PWA chrome color and enables edge-to-edge (notch) layouts.
// `viewport-fit=cover` is what lets us use safe-area insets on iOS.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#ffffff" },
  ],
};

const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;

/* Socials, tracking IDs and the brand mark all live on the same row, so they
   come back in one round trip rather than three. */
async function getShellSettings() {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select(
      "facebook_url, instagram_url, twitter_url, tiktok_url, meta_pixel_id, ga_measurement_id, gtm_id, head_scripts, header_logo_url, logo_url, site_name",
    )
    .single();

  return {
    sameAs: [
      data?.facebook_url,
      data?.instagram_url,
      data?.twitter_url,
      data?.tiktok_url,
    ].filter(Boolean) as string[],
    tracking: data,
    logoUrl: data?.header_logo_url?.trim() || data?.logo_url?.trim() || FALLBACK_LOGO,
    siteName: data?.site_name?.trim() || FALLBACK_SITE_NAME,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ sameAs, tracking, logoUrl, siteName }, flags] = await Promise.all([
    getShellSettings(),
    getSiteFlags(),
  ]);

  return (
    // lang/dir are the static-English defaults; LocaleScript overwrites both
    // before first paint when the visitor's language is something else.
    <html lang={LOCALE_META[DEFAULT_LOCALE].htmlLang} dir={LOCALE_META[DEFAULT_LOCALE].dir} className="scroll-smooth">
      <head>
        <LocaleScript />
        {/* The splash covers the whole screen on first paint, so its artwork is
            the one image worth fetching ahead of everything else. */}
        {flags.splashEnabled && (
          <link rel="preload" as="image" href={flags.splashImageUrl} fetchPriority="high" />
        )}
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
        {/* Capture the install prompt as early as possible — it can fire before
            React hydrates. PwaProvider reads window.deferredInstallPrompt. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.deferredInstallPrompt=e;window.dispatchEvent(new Event('pwa-installable'));});window.addEventListener('appinstalled',function(){window.deferredInstallPrompt=null;});",
          }}
        />
      </head>
      <body
        className={`${inter.className} ${dancing.variable} ${brand.variable} ${arabic.variable} antialiased`}
      >
        <TrackingScripts
          metaPixelId={tracking?.meta_pixel_id}
          gaMeasurementId={tracking?.ga_measurement_id}
          gtmId={tracking?.gtm_id}
          headScripts={tracking?.head_scripts}
        />
        <I18nProvider>
          <FavoritesProvider>{children}</FavoritesProvider>
          <PwaProvider logoUrl={logoUrl} siteName={siteName} />
          {flags.splashEnabled && (
            <SplashScreen imageUrl={flags.splashImageUrl} siteName={siteName} />
          )}
        </I18nProvider>
      </body>
    </html>
  );
}
