"use client";

import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";
import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * Segmented English / العربية control that lives in the header.
 *
 * `compact` drops the written language name and keeps just the flag, which is
 * what the phone header has room for; the full labels return from `sm:` up.
 */
export default function LanguageSwitcher({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { locale, setLocale, switching, t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t("language.switcherLabel")}
      className={`flex items-center gap-0.5 rounded-full bg-gray-100 p-0.5 shrink-0${
        className ? ` ${className}` : ""
      }`}
    >
      {LOCALES.map((code: Locale) => {
        const meta = LOCALE_META[code];
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            // A second tap while the dictionary chunk is still downloading would
            // queue a switch the provider then has to unwind.
            disabled={switching}
            lang={meta.htmlLang}
            aria-pressed={active}
            title={meta.label}
            // Tight on phones on purpose: the header already carries the
            // wordmark and the delivery location, and this must not be what
            // pushes them out.
            className={`flex items-center gap-1 rounded-full px-1 sm:px-2 py-1 text-[10px] sm:text-[11px] font-bold leading-none transition-colors disabled:opacity-70 ${
              active
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span aria-hidden className="text-[11px] sm:text-[12px] leading-none">
              {meta.flag}
            </span>
            <span className={compact ? "hidden sm:inline" : ""}>
              {compact ? meta.short : meta.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
