"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BannerSlide } from "./HeroBanner";
import { useTranslation } from "@/lib/i18n/useTranslation";

const AUTOPLAY_MS = 4500;

/* Shown when no mobile banner is configured in the admin panel, so the page
   never renders an empty hero. Its copy is blank on purpose — the component
   fills it from the dictionary, so the built-in hero speaks the visitor's
   language while an admin-authored banner reads exactly as entered. */
const FALLBACK_ID = "fallback";
const FALLBACK: BannerSlide = {
  id: FALLBACK_ID,
  tag: "",
  headline_orange: "",
  headline_black: "",
  subtitle: "",
  cta_text: "",
  cta_href: "/#restaurants",
  bg_color: "#1d3d2f",
  accent_color: "#f5b32c",
  food_image_url: "/hero/slide-1.png",
  food_alt: "",
  sort_order: 0,
};

/**
 * Is this a light background? Decides whether the copy sits in dark or white
 * text — admin-chosen colours range from near-white promos to the dark brand
 * green, and the text has to stay readable on both.
 */
function isLight(color?: string | null): boolean {
  if (!color) return false;
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(color.trim());
  if (!m) return false;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 165;
}

/**
 * Mobile hero — full-bleed banner with the text left and food bleeding off the
 * right. Content and colours come from the mobile rows of `hero_banners`
 * (admin → Hero Banners → Mobile); several active rows rotate. The search pill
 * in page.tsx overlaps the bottom edge of this banner.
 */
export default function HeroBannerMobile({ slides = [] }: { slides?: BannerSlide[] }) {
  const { t } = useTranslation();
  const list = slides.length > 0 ? slides : [FALLBACK];
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % list.length), [list.length]);

  useEffect(() => {
    if (list.length <= 1) return;
    const id = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [next, list.length]);

  // Guard against the active slide index outliving a shorter list.
  const raw = list[Math.min(current, list.length - 1)];
  // Only the built-in slide takes its words from the dictionary.
  const s: BannerSlide =
    raw.id === FALLBACK_ID
      ? {
          ...raw,
          headline_orange: t("home.hero.headline1"),
          headline_black: t("home.hero.headline2"),
          subtitle: t("home.hero.subtitle"),
          cta_text: t("common.orderNow"),
          food_alt: t("home.hero.foodAlt"),
        }
      : raw;
  const href = s.cta_href || "#";
  const external = /^https?:\/\//.test(href);

  const onLight = isLight(s.bg_color);
  const titleColor = onLight ? "#111827" : "#ffffff";
  const bodyColor = onLight ? "rgba(17,24,39,0.6)" : "rgba(255,255,255,0.8)";
  // On a light accent (the gold brand pill) the label takes the banner colour,
  // which is what gives the original green-on-gold button.
  const ctaTextColor = isLight(s.accent_color) ? s.bg_color || "#111827" : "#ffffff";

  const cta = (
    <>
      {s.cta_text || t("common.orderNow")}
      <ArrowRight size={15} strokeWidth={2.6} />
    </>
  );
  const ctaCls =
    "rise-in inline-flex items-center gap-1.5 font-bold text-[13px] mt-3.5 px-4 py-2 rounded-full active:scale-95 transition-transform";
  const ctaStyle = {
    background: s.accent_color || "#ea580c",
    color: ctaTextColor,
    animationDelay: "210ms",
  };

  return (
    <section className="sm:hidden">
      <div
        className="relative overflow-hidden rounded-t-[28px] transition-colors duration-500"
        style={{ background: s.bg_color || "#1d3d2f", minHeight: "210px" }}
      >
        {/* Food image — right side, bleeding off the edge. The wrapper carries
            the drift so it doesn't fight the image's own slide-change fade. */}
        {s.food_image_url && (
          <div className="hero-float absolute end-[-8px] top-0 bottom-0 w-[48%] pointer-events-none">
            <Image
              key={s.id}
              src={s.food_image_url}
              alt={s.food_alt || s.tag || ""}
              fill
              className="object-contain object-center hc-fade"
              sizes="50vw"
              priority
            />
          </div>
        )}

        {/* Text — keyed on the slide so the copy re-enters line by line every
            time the banner rotates, instead of swapping in place. */}
        <div key={s.id} className="relative z-10 ps-5 pe-[42%] pt-5 pb-10">
          {s.tag && (
            <span
              className="rise-in inline-block text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-full mb-2"
              style={{
                color: s.accent_color,
                border: `1px solid ${s.accent_color}`,
                background: `${s.accent_color}14`,
              }}
            >
              {s.tag}
            </span>
          )}

          {/* Line 1 plain, line 2 in the accent colour — the emphasis the
              mobile hero has always used ("Four Restaurants." above a gold
              "One Easy Order."). The web hero accents the first line instead. */}
          <h2
            className="rise-in font-extrabold leading-[1.05] tracking-tight"
            style={{ fontSize: "clamp(21px, 6.2vw, 27px)", color: titleColor, animationDelay: "70ms" }}
          >
            {s.headline_orange}
            {s.headline_black && (
              <>
                <br />
                <span style={{ color: s.accent_color }}>{s.headline_black}</span>
              </>
            )}
          </h2>

          {s.subtitle && (
            <p
              className="rise-in text-[11px] leading-snug mt-2.5 whitespace-pre-line"
              style={{ color: bodyColor, animationDelay: "140ms" }}
            >
              {s.subtitle.replace(/\\n/g, "\n")}
            </p>
          )}

          {(s.cta_text || s.cta_href) &&
            (external ? (
              <a href={href} className={ctaCls} style={ctaStyle}>{cta}</a>
            ) : (
              <Link href={href} className={ctaCls} style={ctaStyle}>{cta}</Link>
            ))}

          {list.length > 1 && (
            <div className="flex items-center gap-1.5 mt-3">
              {list.map((slide, i) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrent(i)}
                  aria-label={t("home.bannerAria", { number: i + 1 })}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === current ? 16 : 5,
                    height: 5,
                    background: i === current ? s.accent_color : `${s.accent_color}45`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
