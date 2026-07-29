"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BannerSlide } from "./HeroBanner";

const AUTOPLAY_MS = 4500;

// Shown when no mobile banner is configured in the admin panel, so the page
// never renders an empty hero.
const FALLBACK: BannerSlide = {
  id: "fallback",
  tag: "",
  headline_orange: "Four Restaurants.",
  headline_black: "One Easy Order.",
  subtitle:
    "Arabic, Indian, Chinese, Turkish, Shawarma, Pastries, Karak & more – delivered to your door.",
  cta_text: "Order Now",
  cta_href: "/#restaurants",
  bg_color: "#1d3d2f",
  accent_color: "#f5b32c",
  food_image_url: "/hero/slide-1.png",
  food_alt: "Shawarma, karak tea, sandwiches, samosas and more",
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
  const list = slides.length > 0 ? slides : [FALLBACK];
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % list.length), [list.length]);

  useEffect(() => {
    if (list.length <= 1) return;
    const id = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [next, list.length]);

  // Guard against the active slide index outliving a shorter list.
  const s = list[Math.min(current, list.length - 1)];
  const href = s.cta_href || "#";
  const external = /^https?:\/\//.test(href);

  const onLight = isLight(s.bg_color);
  const titleColor = onLight ? "#111827" : "#ffffff";
  const bodyColor = onLight ? "rgba(17,24,39,0.6)" : "rgba(255,255,255,0.8)";
  const ctaTextColor = isLight(s.accent_color) ? "#111827" : "#ffffff";

  const cta = (
    <>
      {s.cta_text || "Order Now"}
      <ArrowRight size={15} strokeWidth={2.6} />
    </>
  );
  const ctaCls =
    "inline-flex items-center gap-1.5 font-bold text-[13px] mt-3.5 px-4 py-2 rounded-full active:scale-95 transition-transform";
  const ctaStyle = { background: s.accent_color || "#ea580c", color: ctaTextColor };

  return (
    <section className="sm:hidden">
      <div
        className="relative overflow-hidden rounded-t-[28px] transition-colors duration-500"
        style={{ background: s.bg_color || "#1d3d2f", minHeight: "210px" }}
      >
        {/* Food image — right side, bleeding off the edge */}
        {s.food_image_url && (
          <div className="absolute right-[-8px] top-0 bottom-0 w-[48%] pointer-events-none">
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

        {/* Text */}
        <div className="relative z-10 pl-5 pr-[42%] pt-5 pb-10">
          {s.tag && (
            <span
              className="inline-block text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-full mb-2"
              style={{
                color: s.accent_color,
                border: `1px solid ${s.accent_color}`,
                background: `${s.accent_color}14`,
              }}
            >
              {s.tag}
            </span>
          )}

          <h2
            className="font-extrabold leading-[1.05] tracking-tight"
            style={{ fontSize: "clamp(21px, 6.2vw, 27px)", color: titleColor }}
          >
            <span style={{ color: s.accent_color }}>{s.headline_orange}</span>
            {s.headline_black && (
              <>
                <br />
                {s.headline_black}
              </>
            )}
          </h2>

          {s.subtitle && (
            <p
              className="text-[11px] leading-snug mt-2.5 whitespace-pre-line line-clamp-3"
              style={{ color: bodyColor }}
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
                  aria-label={`Banner ${i + 1}`}
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
