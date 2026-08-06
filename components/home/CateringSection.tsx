"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star, Users, CalendarCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { TranslationKey } from "@/lib/i18n/types";

const STATS: { icon: typeof Star; value: string; labelKey: TranslationKey; color: string }[] = [
  { icon: Star,          value: "5.0",  labelKey: "home.catering.statRating", color: "#f59e0b" },
  { icon: Users,         value: "500+", labelKey: "home.catering.statEvents", color: "#ea580c" },
  { icon: CalendarCheck, value: "UAE",  labelKey: "home.catering.statReach",  color: "#2563eb" },
];

export default function CateringSection() {
  const { t } = useTranslation();

  return (
    <section className="px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div
          className="rounded-3xl overflow-hidden flex items-stretch relative"
          style={{ background: "#fff8f2", minHeight: "160px" }}
        >
          {/* LEFT: text */}
          <div className="flex flex-col justify-center px-6 sm:px-8 py-6 w-[58%] sm:w-[55%] z-10">
            {/* Headline */}
            <p className="text-gray-700 font-medium text-sm sm:text-base leading-tight mb-0.5">
              {t("home.catering.kicker")}
            </p>
            <h3
              className="font-extrabold leading-tight mb-2"
              style={{ color: "#ea580c", fontSize: "clamp(20px, 4.5vw, 32px)" }}
            >
              {t("home.catering.title")}
            </h3>

            {/* Subtitle */}
            <p className="text-gray-500 text-xs sm:text-sm mb-4 leading-relaxed">
              {t("home.catering.subtitle")}
            </p>

            {/* Stats */}
            <div className="flex gap-4 mb-4">
              {STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.labelKey} className="flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15` }}>
                      <Icon size={13} style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="text-gray-900 font-black text-xs leading-none">{s.value}</p>
                      <p className="text-gray-400 text-[9px] mt-0.5 uppercase tracking-wide">{t(s.labelKey)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <Link
              href="/catering"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-bold text-xs sm:text-sm transition-all hover:gap-3 active:scale-95 w-fit"
              style={{ background: "#ea580c", boxShadow: "0 4px 16px rgba(234,88,12,0.25)" }}
            >
              {t("home.catering.cta")} <ArrowRight size={13} />
            </Link>
          </div>

          {/* RIGHT: image bleeding to edge */}
          <div className="absolute end-0 top-0 bottom-0 w-[46%] sm:w-[48%]">
            <Image
              src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80"
              alt={t("home.catering.imageAlt")}
              fill
              className="object-cover object-center"
              sizes="(max-width: 640px) 46vw, 48vw"
            />
            {/* Fade the inner edge into the warm background */}
            <div
              className="absolute inset-0 edge-fade"
              style={{
                ["--fade-from" as string]: "#fff8f2",
                ["--fade-mid" as string]: "#fff8f2aa",
                ["--fade-stop" as string]: "15%",
                ["--fade-end" as string]: "45%",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
