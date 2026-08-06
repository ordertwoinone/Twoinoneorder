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

async function getData() {
  const [{ data: settings }, { data: locations }] = await Promise.all([
    supabaseAdmin
      .from("site_settings")
      .select(
        "logo_url, header_logo_url, whatsapp_number, phone, email, address, city, contact_heading, contact_heading_highlight, contact_subheading, contact_hours, contact_restaurant_name, contact_rating, contact_reviews, contact_location_label",
      )
      .single(),
    supabaseAdmin
      .from("contact_locations")
      .select("id, name, address, latitude, longitude, maps_url")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);
  return { settings, locations: (locations as ContactLocation[]) || [] };
}

export default async function ContactPage() {
  const { settings, locations } = await getData();

  /* Anything the admin panel has not filled in is left null and resolved from
     the dictionary in ContactContent, so the defaults follow the language
     rather than being frozen in English here. */
  const content: ContactSettings = {
    logo: settings?.header_logo_url?.trim() || settings?.logo_url?.trim() || FALLBACK_LOGO,
    phone: settings?.phone || "+971 52 230 5216",
    email: settings?.email || "info@twoinoneae.com",
    waNumber: (settings?.whatsapp_number || "971522305216").replace(/\D/g, ""),
    restaurantName: settings?.contact_restaurant_name || null,
    rating: settings?.contact_rating || null,
    reviews: settings?.contact_reviews || null,
    locationLabel:
      settings?.contact_location_label ||
      (settings?.address ? `${settings.address}${settings.city ? `, ${settings.city}` : ""}` : null),
    heading: settings?.contact_heading || null,
    headingHighlight: settings?.contact_heading_highlight || null,
    subheading: settings?.contact_subheading || null,
    hours: settings?.contact_hours || null,
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
