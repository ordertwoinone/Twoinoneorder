"use client";

import { Star, MapPin, MessageCircle, Mail, Clock, ChevronRight } from "lucide-react";
import ContactQuickActions from "@/components/contact/ContactQuickActions";
import ContactMap, { ContactLocation } from "@/components/contact/ContactMap";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLocalized } from "@/lib/i18n/localized";

export interface ContactSettings {
  logo: string;
  phone: string;
  email: string;
  waNumber: string;
  /** Anything left null here falls back to the dictionary copy. */
  restaurantName: string | null;
  rating: string | null;
  reviews: string | null;
  locationLabel: string | null;
  heading: string | null;
  headingHighlight: string | null;
  subheading: string | null;
  hours: string | null;
  /* Arabic twins from admin → Contact Details; blank falls back to English. */
  restaurantNameAr: string | null;
  reviewsAr: string | null;
  locationLabelAr: string | null;
  headingAr: string | null;
  headingHighlightAr: string | null;
  subheadingAr: string | null;
  hoursAr: string | null;
}

export default function ContactContent({
  settings,
  locations,
}: {
  settings: ContactSettings;
  locations: ContactLocation[];
}) {
  const { t } = useTranslation();
  const localized = useLocalized();

  /* Arabic typed in admin wins, then the English column, then our own copy. */
  const field = (en: string | null, ar: string | null, fallback: string) =>
    localized(en, ar) || fallback;

  const restaurantName = field(settings.restaurantName, settings.restaurantNameAr, t("contact.defaultRestaurantName"));
  const rating = settings.rating || "4.8";
  const reviews = field(settings.reviews, settings.reviewsAr, t("contact.defaultReviews"));
  const locationLabel = field(settings.locationLabel, settings.locationLabelAr, t("contact.defaultLocation"));
  const heading = field(settings.heading, settings.headingAr, t("contact.defaultHeading"));
  const headingHighlight = field(settings.headingHighlight, settings.headingHighlightAr, t("contact.defaultHeadingHighlight"));
  const subheading = field(settings.subheading, settings.subheadingAr, t("contact.defaultSubheading"));
  const hours = field(settings.hours, settings.hoursAr, t("contact.defaultHours"));

  // Phone, Save Contact and Location cards intentionally omitted (per design).
  const methods = [
    {
      icon: MessageCircle,
      label: t("common.whatsapp"),
      value: t("contact.whatsappValue"),
      sub: t("contact.whatsappSub"),
      href: `https://wa.me/${settings.waNumber}`,
      external: true,
      ltr: false,
      bg: "#dcfce7",
      color: "#16a34a",
    },
    {
      icon: Mail,
      label: t("contact.emailLabel"),
      value: settings.email,
      sub: t("contact.emailSub"),
      href: `mailto:${settings.email}`,
      ltr: true,
      bg: "#e0e7ff",
      color: "#4f46e5",
    },
    {
      icon: Clock,
      label: t("contact.hoursLabel"),
      value: hours,
      sub: t("contact.hoursSub"),
      ltr: false,
      bg: "#ffedd5",
      color: "#ea580c",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-3xl mt-2 sm:mt-4"
        style={{ background: "linear-gradient(to right,#fdf0e6 0%,#fbe2cf 56%,#fbe2cf 100%)" }}
      >
        <div className="relative z-10 p-5 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.logo} alt={restaurantName} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
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
          phone={settings.phone}
          waNumber={settings.waNumber}
          restaurantName={restaurantName}
          email={settings.email}
          address={locationLabel}
        />
      </div>

      {/* ── Contact method cards ─────────────────────────── */}
      <div className="mt-4 bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
        {methods.map(({ icon: Icon, label, value, sub, href, external, ltr, bg, color }) => {
          const inner = (
            <>
              <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: bg, color }}>
                <Icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-gray-400">{label}</p>
                <p className={`text-[15px] font-bold text-gray-900 truncate${ltr ? " force-ltr" : ""}`}>{value}</p>
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
          href={`https://wa.me/${settings.waNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-500/25 transition-all active:scale-[0.99]"
        >
          <MessageCircle size={20} />
          <span className="text-start leading-tight">
            <span className="block text-[15px]">{t("contact.whatsappBarTitle")}</span>
            <span className="block text-[11px] font-medium opacity-90">{t("contact.whatsappBarSub")}</span>
          </span>
        </a>
      </div>
    </div>
  );
}
