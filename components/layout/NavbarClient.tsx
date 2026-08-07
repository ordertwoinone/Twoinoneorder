"use client";
import Link from "next/link";
import Image from "next/image";
import { MapPin, ChevronDown, Loader2 } from "lucide-react";
import { useLocation } from "@/hooks/useLocation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLocalized } from "@/lib/i18n/localized";
import LanguageSwitcher from "./LanguageSwitcher";

export interface NavbarContent {
  /** Dark half of the wordmark, e.g. "TWOINONE". */
  title: string;
  titleAr: string | null;
  /** Orange half, e.g. "ORDER". Blank hides it. */
  titleHighlight: string;
  titleHighlightAr: string | null;
  /** Small line under the wordmark. Blank hides it. */
  tagline: string;
  taglineAr: string | null;
  logoUrl: string;
  /** admin → Header. Off hides the mark and the wordmark leads the row. */
  logoEnabled: boolean;
}

export default function NavbarClient({
  className = "",
  content,
}: {
  className?: string;
  content: NavbarContent;
}) {
  const { location, detect } = useLocation();
  const { t } = useTranslation();
  const localized = useLocalized();

  const title = localized(content.title, content.titleAr);
  const titleHighlight = localized(content.titleHighlight, content.titleHighlightAr);
  const tagline = localized(content.tagline, content.taglineAr);

  const displayArea =
    location.status === "granted" ? location.area : t("header.setLocation");

  return (
    <nav className={`sticky top-0 z-50 bg-white${className ? ` ${className}` : ""}`}>
      <div className="max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center gap-3">

        {/* Logo + wordmark — leads the header. With the logo switched off in
            admin the wordmark takes its place at the start of the row; the gap
            collapses on its own because there is only one child left. */}
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {content.logoEnabled && (
            <div className="relative w-10 h-10 shrink-0">
              <Image
                src={content.logoUrl}
                alt={title}
                fill
                className="object-contain"
                priority
              />
            </div>
          )}
          <div className="min-w-0 text-start">
            {/* No `uppercase` here — the wordmark reads exactly as it is typed
                in admin → Header, caps and all. */}
            <p className="font-brand text-[11.5px] sm:text-[14px] font-extrabold leading-none tracking-tight truncate">
              <span className="text-gray-900">{title}</span>
              {titleHighlight && (
                <span style={{ color: "#ea580c" }}> {titleHighlight}</span>
              )}
            </p>
            {tagline && (
              <p className="font-brand text-[8px] sm:text-[9.5px] font-semibold text-gray-400 leading-none mt-1 truncate">
                {tagline}
              </p>
            )}
          </div>
        </Link>

        {/* "Deliver to" then the language switch, which closes the row. They
            share one shrink-0 group so the wordmark, not this pair, is what
            gives way on a narrow phone. */}
        <div className="ms-auto flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Tap to detect */}
          <button
            onClick={detect}
            disabled={location.status === "loading"}
            aria-label={t("header.setLocationAria")}
            className="shrink-0 flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-start hover:bg-gray-50 transition-colors disabled:cursor-default"
          >
            <MapPin size={15} fill="#ea580c" stroke="none" className="shrink-0" />
            <span className="min-w-0">
              <span className="block text-[8px] text-gray-400 leading-none mb-0.5">
                {t("header.deliverTo")}
              </span>
              {location.status === "loading" ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                  <Loader2 size={10} className="animate-spin" style={{ color: "#ea580c" }} />
                  {t("header.detecting")}
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-gray-900">
                  <span className="truncate max-w-[70px] sm:max-w-[150px]">{displayArea}</span>
                  <ChevronDown size={11} className="text-gray-500 shrink-0" />
                </span>
              )}
            </span>
          </button>

          <LanguageSwitcher compact />
        </div>
      </div>
    </nav>
  );
}
