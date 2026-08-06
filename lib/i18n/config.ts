// Central language configuration. Everything else in lib/i18n reads from here,
// so adding a third language is a matter of adding an entry to LOCALES and a
// dictionary file under lib/i18n/dictionaries.

export const LOCALES = ["en", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Key used for both the localStorage entry and the `?lang=` query parameter. */
export const LOCALE_STORAGE_KEY = "tio-locale";
export const LOCALE_QUERY_PARAM = "lang";

interface LocaleMeta {
  /** Language name written in that language — what the switcher shows. */
  label: string;
  /** Short label for narrow screens. */
  short: string;
  flag: string;
  dir: "ltr" | "rtl";
  /** BCP-47 tag for `<html lang>`, Intl APIs and hreflang. */
  htmlLang: string;
  /** Open Graph locale. */
  ogLocale: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: {
    label: "English",
    short: "EN",
    flag: "🇬🇧",
    dir: "ltr",
    htmlLang: "en",
    ogLocale: "en_AE",
  },
  ar: {
    label: "العربية",
    short: "ع",
    flag: "🇦🇪",
    dir: "rtl",
    htmlLang: "ar",
    ogLocale: "ar_AE",
  },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return LOCALE_META[locale].dir;
}

/**
 * Best match for a list of browser languages ("ar-AE", "en-GB", …).
 * Falls back to the default locale when nothing matches.
 */
export function matchLocale(languages: readonly string[] | undefined): Locale {
  for (const lang of languages ?? []) {
    const base = lang.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
