import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Heart, Star, MapPin, MessageCircle, Mail, Clock, ChevronRight } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import { supabaseAdmin } from "@/lib/supabase-admin";
import ContactQuickActions from "@/components/contact/ContactQuickActions";
import ContactMap, { ContactLocation } from "@/components/contact/ContactMap";

export const metadata: Metadata = {
  title: "Contact Us — Two In One UAE",
  description:
    "Get in touch with Two In One UAE. Call, WhatsApp or email us for orders, catering enquiries, table bookings and more.",
};

const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&q=80";

async function getData() {
  const [{ data: settings }, { data: locations }] = await Promise.all([
    supabaseAdmin
      .from("site_settings")
      .select(
        "logo_url, whatsapp_number, phone, email, address, city, contact_heading, contact_heading_highlight, contact_subheading, contact_hours, contact_restaurant_name, contact_rating, contact_reviews, contact_location_label, contact_hero_image_url"
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

  const phone = settings?.phone || "+971 52 230 5216";
  const email = settings?.email || "info@twoinoneae.com";
  const waNumber = (settings?.whatsapp_number || "971522305216").replace(/\D/g, "");
  const logo = settings?.logo_url || "/logos/two-in-one.png";

  const restaurantName = settings?.contact_restaurant_name || "Two in One Restaurant";
  const rating = settings?.contact_rating || "4.8";
  const reviews = settings?.contact_reviews || "2.3K+ Reviews";
  const locationLabel =
    settings?.contact_location_label ||
    (settings?.address ? `${settings.address}${settings.city ? `, ${settings.city}` : ""}` : "Al Nahda, Fujairah, Dubai");
  const heroImage = settings?.contact_hero_image_url || DEFAULT_HERO;

  const heading = settings?.contact_heading || "Get in";
  const headingHighlight = settings?.contact_heading_highlight || "Touch";
  const subheading =
    settings?.contact_subheading ||
    "We're here to help with orders, catering, buffet booking & table reservations.";
  const hours = settings?.contact_hours || "Every day · 9:00 AM – 11:00 PM";

  // Phone, Save Contact and Location cards intentionally omitted (per design).
  const methods = [
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: "Chat with our team",
      sub: "We reply instantly",
      href: `https://wa.me/${waNumber}`,
      external: true,
      bg: "#dcfce7",
      color: "#16a34a",
    },
    {
      icon: Mail,
      label: "Email",
      value: email,
      sub: "Drop us an email anytime",
      href: `mailto:${email}`,
      bg: "#e0e7ff",
      color: "#4f46e5",
    },
    {
      icon: Clock,
      label: "Opening Hours",
      value: hours,
      sub: "We're open to serve you",
      bg: "#ffedd5",
      color: "#ea580c",
    },
  ];

  return (
    <>
      {/* Desktop keeps the full navbar; mobile uses the slim app-style header below */}
      <Navbar className="hidden sm:block" />

      {/* Mobile header */}
      <div className="sm:hidden flex items-center justify-between px-4 h-14">
        <Link href="/" aria-label="Back" className="w-9 h-9 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-orange-500">
          <ChevronLeft size={20} />
        </Link>
        <Link href="/account/favourites" aria-label="Favourites" className="w-9 h-9 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-700">
          <Heart size={18} />
        </Link>
      </div>

      <main className="bg-white pb-32 sm:pb-10">
        <div className="max-w-3xl mx-auto px-4">

          {/* ── Hero ─────────────────────────────────────────── */}
          <section
            className="relative overflow-hidden rounded-3xl mt-2 sm:mt-4"
            style={{ background: "linear-gradient(to right,#fdf0e6 0%,#fbe2cf 56%,#fbe2cf 100%)" }}
          >
            {/* Food image — bleeds in from the right and fades into the peach */}
            <div className="absolute top-0 right-0 h-full w-[40%] sm:w-[40%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImage} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(to right,#fbe2cf 0%,#fbe2cf 16%,rgba(251,226,207,0) 72%)" }}
              />
            </div>

            <div className="relative z-10 p-5 sm:p-8 pr-[37%] sm:pr-[42%]">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt={restaurantName} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
                </div>
                <h1 className="text-lg sm:text-3xl font-extrabold text-gray-900 leading-snug min-w-0">{restaurantName}</h1>
              </div>

              <div className="flex items-center gap-1.5 mt-3">
                <Star size={15} className="fill-orange-400 stroke-orange-400 shrink-0" />
                <span className="text-sm font-bold text-gray-900">{rating}</span>
                <span className="text-[12.5px] text-gray-500">({reviews})</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-[12.5px] text-gray-600">
                <MapPin size={14} className="text-orange-500 shrink-0" />
                <span>{locationLabel}</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-gray-900 mt-5 leading-tight">
                {heading} <span style={{ color: "#ea580c" }}>{headingHighlight}</span>
              </h2>
              <p className="text-[13px] sm:text-[15px] text-gray-600 mt-2 leading-relaxed">{subheading}</p>
            </div>
          </section>

          {/* ── Quick actions ────────────────────────────────── */}
          <div className="mt-4">
            <ContactQuickActions
              phone={phone}
              waNumber={waNumber}
              restaurantName={restaurantName}
              email={email}
              address={locationLabel}
            />
          </div>

          {/* ── Contact method cards ─────────────────────────── */}
          <div className="mt-4 bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
            {methods.map(({ icon: Icon, label, value, sub, href, external, bg, color }) => {
              const inner = (
                <>
                  <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: bg, color }}>
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-gray-400">{label}</p>
                    <p className="text-[15px] font-bold text-gray-900 truncate">{value}</p>
                    <p className="text-[12px] text-gray-400">{sub}</p>
                  </div>
                  {href && <ChevronRight size={18} className="text-gray-300 shrink-0" />}
                </>
              );
              return href ? (
                <a
                  key={label}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-3.5 px-4 py-4 hover:bg-gray-50 transition-colors"
                >
                  {inner}
                </a>
              ) : (
                <div key={label} className="flex items-center gap-3.5 px-4 py-4">{inner}</div>
              );
            })}
          </div>

          {/* ── Map with all branches ────────────────────────── */}
          {locations.length > 0 && (
            <div className="mt-4">
              <ContactMap locations={locations} />
            </div>
          )}

          {/* ── WhatsApp bar (fixed above bottom nav on mobile) ── */}
          <div className="fixed sm:static bottom-[72px] left-0 right-0 z-40 px-4 sm:px-0 sm:mt-4 max-w-3xl mx-auto">
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-500/25 transition-all active:scale-[0.99]"
            >
              <MessageCircle size={20} />
              <span className="text-left leading-tight">
                <span className="block text-[15px]">WhatsApp Us</span>
                <span className="block text-[11px] font-medium opacity-90">We reply in minutes</span>
              </span>
            </a>
          </div>
        </div>

        <div className="hidden sm:block">
          <Footer />
        </div>
      </main>

      <BottomNav />
    </>
  );
}
