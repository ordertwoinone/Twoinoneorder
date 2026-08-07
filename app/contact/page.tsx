import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { FALLBACK_LOGO } from "@/lib/branding";
import PageMeta from "@/lib/i18n/PageMeta";
import type { ContactLocation } from "@/components/contact/ContactMap";
import ContactContent, { ContactSettings } from "./ContactContent";

export const metadata: Metadata = {
  title: "Contact Us — Two In One UAE",
  description:
    "Get in touch with Two In One UAE. Call, WhatsApp or email us for orders, catering enquiries, table bookings and more.",
};

const SETTINGS_COLUMNS =
  "logo_url, header_logo_url, whatsapp_number, phone, email, address, city, contact_heading, contact_heading_highlight, contact_subheading, contact_hours, contact_restaurant_name, contact_rating, contact_reviews, contact_location_label";
/* Added by supabase/arabic_translations.sql. */
const SETTINGS_ARABIC =
  "address_ar, city_ar, contact_heading_ar, contact_heading_highlight_ar, contact_subheading_ar, contact_hours_ar, contact_restaurant_name_ar, contact_reviews_ar, contact_location_label_ar";

const LOCATION_COLUMNS = "id, name, address, latitude, longitude, maps_url";
const LOCATION_ARABIC = "name_ar, address_ar";

type Row = Record<string, string | null>;

/**
 * PostgREST rejects the whole select if one column is unknown, so ask for the
 * Arabic twins and fall back to the English columns alone — the page renders
 * either way, just without translations until the migration is run.
 */
async function selectWithArabic(table: string, base: string, arabic: string, single: boolean) {
  const run = (columns: string) => {
    const q = supabaseAdmin.from(table).select(columns);
    return single
      ? q.single()
      : q.eq("is_active", true).order("sort_order", { ascending: true });
  };

  const full = await run(`${base}, ${arabic}`);
  if (!full.error) return full.data;
  const fallback = await run(base);
  return fallback.error ? null : fallback.data;
}

async function getData() {
  const [settings, locations] = await Promise.all([
    selectWithArabic("site_settings", SETTINGS_COLUMNS, SETTINGS_ARABIC, true) as Promise<Row | null>,
    selectWithArabic("contact_locations", LOCATION_COLUMNS, LOCATION_ARABIC, false) as Promise<
      ContactLocation[] | null
    >,
  ]);
  return { settings, locations: locations ?? [] };
}

export default async function ContactPage() {
  const { settings, locations } = await getData();

  /* Anything the admin panel has not filled in is left null and resolved from
     the dictionary in ContactContent, so the defaults follow the language
     rather than being frozen in English here. */
  const address = settings?.address
    ? `${settings.address}${settings.city ? `, ${settings.city}` : ""}`
    : null;
  const addressAr = settings?.address_ar
    ? `${settings.address_ar}${settings.city_ar ? `، ${settings.city_ar}` : ""}`
    : null;

  const content: ContactSettings = {
    logo: settings?.header_logo_url?.trim() || settings?.logo_url?.trim() || FALLBACK_LOGO,
    phone: settings?.phone || "+971 52 230 5216",
    email: settings?.email || "info@twoinoneae.com",
    waNumber: (settings?.whatsapp_number || "971522305216").replace(/\D/g, ""),
    restaurantName: settings?.contact_restaurant_name || null,
    restaurantNameAr: settings?.contact_restaurant_name_ar || null,
    rating: settings?.contact_rating || null,
    reviews: settings?.contact_reviews || null,
    reviewsAr: settings?.contact_reviews_ar || null,
    locationLabel: settings?.contact_location_label || address,
    locationLabelAr: settings?.contact_location_label_ar || addressAr,
    heading: settings?.contact_heading || null,
    headingAr: settings?.contact_heading_ar || null,
    headingHighlight: settings?.contact_heading_highlight || null,
    headingHighlightAr: settings?.contact_heading_highlight_ar || null,
    subheading: settings?.contact_subheading || null,
    subheadingAr: settings?.contact_subheading_ar || null,
    hours: settings?.contact_hours || null,
    hoursAr: settings?.contact_hours_ar || null,
  };

  return (
    <>
      <PageMeta titleKey="contact.metaTitle" descriptionKey="contact.metaDescription" />
      <Navbar />

      <main className="bg-white pb-32 sm:pb-10">
        <ContactContent settings={content} locations={locations} />

        <div className="hidden sm:block">
          <Footer />
        </div>
      </main>

      <BottomNav />
    </>
  );
}
