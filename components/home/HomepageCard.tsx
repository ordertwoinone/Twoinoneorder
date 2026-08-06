"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export interface HomepageCardData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  emoji: string;
  image_url: string;
  badge: string;
  button_text: string;
  href: string;
  accent_color: string;
  bg_from: string;
  bg_to: string;
  /**
   * Set only on the built-in cards, which have dictionary copy behind them.
   * Cards created in the admin panel leave it undefined and render as typed.
   */
  i18nPrefix?: string;
}

export default function HomepageCard({
  card,
  wrapperClass,
  wrapperStyle,
}: {
  card: HomepageCardData;
  wrapperClass: string;
  wrapperStyle?: CSSProperties;
}) {
  const { tMaybe } = useTranslation();
  const field = (name: string, value: string) =>
    card.i18nPrefix ? tMaybe(`${card.i18nPrefix}${name}`, value) : value;

  const title = field("Title", card.title);
  const subtitle = field("Subtitle", card.subtitle);
  const description = field("Description", card.description);
  const badge = field("Badge", card.badge);
  const buttonText = card.i18nPrefix
    ? tMaybe(`${card.i18nPrefix}Button`, card.button_text)
    : card.button_text;

  const isExternal = card.href?.startsWith("http");

  const cardEl = (
    <div className="group bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 overflow-hidden flex flex-col h-full">

      {/* Image / Emoji — sits inside with margin, its own rounded corners */}
      <div className="mx-1.5 mt-1.5 sm:mx-3 sm:mt-3 rounded-xl sm:rounded-2xl overflow-hidden flex-shrink-0">
        <div
          className="relative w-full flex items-center justify-center min-h-[84px] sm:min-h-[160px]"
          style={{
            background: `linear-gradient(135deg, ${card.bg_from} 0%, ${card.bg_to} 100%)`,
          }}
        >
          {card.image_url ? (
            <Image
              src={card.image_url}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 33vw, 25vw"
            />
          ) : (
            <span className="text-3xl sm:text-7xl select-none py-4 sm:py-6 drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
              {card.emoji}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-2 pt-2 pb-2.5 sm:px-4 sm:pt-3 sm:pb-4 flex flex-col flex-1 gap-1 sm:gap-1.5">

        {/* Title + badge chip */}
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-gray-900 text-[11px] sm:text-base leading-tight truncate">
            {title}
          </h3>
          {badge && (
            <span
              className="hidden sm:inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full text-white leading-none shrink-0"
              style={{ background: card.accent_color }}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-gray-400 text-[9px] sm:text-[13px] leading-snug sm:leading-relaxed line-clamp-2">
            {description}
          </p>
        )}

        {/* Bottom row — subtitle chip + CTA */}
        <div className="flex items-center gap-2 mt-auto pt-2 sm:pt-3">
          {subtitle && (
            <span className="hidden xl:flex items-center gap-1 text-[12px] text-gray-500 font-medium bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap truncate min-w-0">
              {subtitle}
            </span>
          )}

          <div
            className="w-full sm:w-auto sm:ms-auto shrink-0 flex items-center justify-center gap-1.5 px-1.5 sm:px-4 py-1.5 sm:py-1.5 rounded-full text-[10px] sm:text-[13px] font-bold whitespace-nowrap transition-all duration-200 group-hover:gap-2.5 overflow-hidden"
            style={{
              background: `${card.accent_color}15`,
              color: card.accent_color,
            }}
          >
            <span className="truncate">{buttonText}</span>
            {/* Arrow costs ~20px — too much next to the label once the
                card is a third of a phone screen wide. */}
            <ArrowRight size={13} strokeWidth={2.5} className="hidden sm:block shrink-0 group-hover:translate-x-0.5 transition-transform duration-200" />
          </div>
        </div>

      </div>
    </div>
  );

  return isExternal ? (
    <a href={card.href} target="_blank" rel="noopener noreferrer" className={wrapperClass} style={wrapperStyle}>
      {cardEl}
    </a>
  ) : (
    <Link href={card.href} className={wrapperClass} style={wrapperStyle}>
      {cardEl}
    </Link>
  );
}
