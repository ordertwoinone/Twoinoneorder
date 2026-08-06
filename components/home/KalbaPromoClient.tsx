"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star, Clock, MapPin } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export interface KalbaPromoContent {
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  image_url: string;
  button_text: string;
  perks: string[];
  rating: string;
  ratingCount: string;
  deliveryTime: string;
  location: string;
  isOpen: boolean;
}

/**
 * Same idea as KalbaContent's SEEDED_COPY: the built-in wording is ours and
 * translates, anything rewritten in admin → Campus Promo shows as entered.
 */
const SEEDED_COPY: Record<string, string> = {
  "Two in One University Kalba": "home.campus.title",
  "Made for Students, Loved by Everyone!": "home.campus.subtitle",
  "Student-friendly prices · Fresh food · Free WiFi": "home.campus.description",
  "🎓 On Campus": "home.campus.badge",
  "View Menu": "common.viewMenu",
  "Student Prices": "home.campus.perk1",
  "Free WiFi": "home.campus.perk2",
  "Open Late": "home.campus.perk3",
  "Near University of Kalba": "home.campus.location",
};

export default function KalbaPromoClient({ promo }: { promo: KalbaPromoContent }) {
  const { t, tMaybe } = useTranslation();
  const copy = (value: string) => (value ? tMaybe(SEEDED_COPY[value] ?? "", value) : value);

  return (
    <section className="py-4 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
            {t("home.campusTitle")}
          </h2>
          <Link
            href="/restaurant/university-kalba"
            className="flex items-center gap-1 text-xs font-bold"
            style={{ color: "#ea580c" }}
          >
            {t("common.explore")} <ArrowRight size={13} />
          </Link>
        </div>

        {/* Card */}
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(120deg, #fff8f2 0%, #fdeede 50%, #fde3c8 100%)",
            boxShadow: "0 4px 24px rgba(234,88,12,0.10)",
            border: "1px solid #fcd9b6",
          }}
        >
          {/* Subtle dot grid */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #ea580c 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row items-stretch">
            {/* LEFT — content */}
            <div className="flex-1 px-6 py-7 sm:px-8 sm:py-8 flex flex-col justify-between">

              {/* Badge + open pill */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {promo.badge && (
                  <span
                    className="text-[11px] font-extrabold px-3 py-1 rounded-full text-white"
                    style={{ background: "#ea580c" }}
                  >
                    {copy(promo.badge)}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    promo.isOpen
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-600 border-red-200"
                  }`}
                >
                  {promo.isOpen ? t("home.campus.openNow") : t("home.campus.closedNow")}
                </span>
              </div>

              {/* Title */}
              <div className="mb-3">
                <h3 className="text-gray-900 font-extrabold leading-tight"
                  style={{ fontSize: "clamp(20px, 4vw, 30px)" }}>
                  {copy(promo.title)}
                </h3>
                {promo.subtitle && (
                  <p
                    className="font-extrabold leading-tight mt-1"
                    style={{ fontSize: "clamp(13px, 2.5vw, 18px)", color: "#ea580c" }}
                  >
                    {copy(promo.subtitle)}
                  </p>
                )}
              </div>

              {/* Location */}
              <div className="flex items-center gap-1.5 mb-4">
                <MapPin size={12} className="text-orange-400 shrink-0" />
                <p className="text-gray-500 text-[11px]">{copy(promo.location)}</p>
              </div>

              {/* Perk chips */}
              {promo.perks.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {promo.perks.map((p) => (
                    <span
                      key={p}
                      className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white border border-orange-200 text-gray-700"
                      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                    >
                      {copy(p)}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-700">
                  <Star size={11} className="fill-yellow-400 stroke-yellow-400" />
                  {promo.rating}
                  <span className="text-gray-400 font-normal">({promo.ratingCount})</span>
                </span>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1 text-[11px] text-gray-500">
                  <Clock size={10} />
                  {promo.deliveryTime}
                </span>
                {promo.description && (
                  <>
                    <span className="text-gray-300 hidden sm:block">·</span>
                    <span className="text-[11px] text-gray-500 hidden sm:block">{copy(promo.description)}</span>
                  </>
                )}
              </div>

              {/* CTA */}
              <Link
                href="/restaurant/university-kalba"
                className="self-start inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-extrabold text-sm text-white transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: "#ea580c",
                  boxShadow: "0 4px 16px rgba(234,88,12,0.35)",
                }}
              >
                {copy(promo.button_text) || t("common.viewMenu")}
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* RIGHT — image */}
            <div className="relative sm:w-[42%] lg:w-[38%] h-56 sm:h-auto shrink-0">
              {promo.image_url ? (
                <>
                  <div
                    className="absolute inset-y-0 start-0 w-16 z-10 pointer-events-none edge-fade"
                    style={{
                      ["--fade-from" as string]: "#fde3c8",
                      ["--fade-mid" as string]: "transparent",
                      ["--fade-stop" as string]: "100%",
                      ["--fade-end" as string]: "100%",
                    }}
                  />
                  <Image
                    src={promo.image_url}
                    alt={copy(promo.title)}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 42vw"
                  />
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-4">
                  <span className="text-7xl sm:text-8xl select-none">🎓</span>
                  <div className="text-center">
                    <p className="text-gray-400 text-xs font-semibold">{t("home.campus.addImage")}</p>
                    <p className="text-gray-300 text-[10px]">{t("home.campus.addImageHint")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom accent bar */}
          <div
            className="h-1 w-full"
            style={{ background: "linear-gradient(90deg, #ea580c, #f59e0b, #ea580c)" }}
          />
        </div>

      </div>
    </section>
  );
}
