"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_META,
  LOCALE_QUERY_PARAM,
  LOCALE_STORAGE_KEY,
  type Locale,
  isLocale,
  matchLocale,
} from "./config";
import { EN_FLAT, getCachedDictionary, loadDictionary } from "./dictionaries";
import type {
  FlatDictionary,
  PluralKey,
  TranslationKey,
  TranslationListKey,
  TranslationVars,
} from "./types";

/** Title/description a page has claimed for the current route. */
export interface PageMetaValue {
  title?: string;
  description?: string;
}

interface I18nContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  isRtl: boolean;
  /** True until the chosen dictionary has finished loading. */
  switching: boolean;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey, vars?: TranslationVars) => string;
  tp: (key: PluralKey, count: number, vars?: TranslationVars) => string;
  tList: (key: TranslationListKey) => readonly string[];
  /**
   * For values that come from the admin panel rather than the dictionary — a
   * cuisine name, a table section, a badge. If the dictionary happens to know
   * the string it is translated; otherwise it is shown exactly as entered.
   */
  tMaybe: (key: string, fallback: string) => string;
  setPageMeta: (meta: PageMetaValue | null) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const PLACEHOLDER = /\{(\w+)\}/g;

function interpolate(template: string, vars?: TranslationVars): string {
  if (!vars) return template;
  return template.replace(PLACEHOLDER, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

function readString(flat: FlatDictionary, key: string): string | undefined {
  const value = flat[key];
  return typeof value === "string" ? value : undefined;
}

/** Reads the preference the pre-hydration script already resolved, if any. */
function storedLocale(): Locale | null {
  try {
    const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

function queryLocale(): Locale | null {
  const value = new URLSearchParams(window.location.search).get(LOCALE_QUERY_PARAM);
  return isLocale(value) ? value : null;
}

/**
 * Resolution order, matching the pre-hydration script in LocaleScript:
 *   1. an explicit ?lang= on the URL (shareable, and what hreflang points at)
 *   2. the saved preference
 *   3. the browser's languages, on a first visit
 */
function resolveInitialLocale(): Locale {
  const fromQuery = queryLocale();
  if (fromQuery) return fromQuery;
  const saved = storedLocale();
  if (saved) return saved;
  return matchLocale(typeof navigator === "undefined" ? [] : navigator.languages);
}

/** Creates the tag if it is missing, so this works on any page. */
function upsertMeta(selector: string, create: () => HTMLMetaElement, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function metaByProperty(property: string, content: string) {
  upsertMeta(`meta[property="${property}"]`, () => {
    const el = document.createElement("meta");
    el.setAttribute("property", property);
    return el;
  }, content);
}

function metaByName(name: string, content: string) {
  upsertMeta(`meta[name="${name}"]`, () => {
    const el = document.createElement("meta");
    el.setAttribute("name", name);
    return el;
  }, content);
}

/**
 * One <link rel="alternate" hreflang> per language plus x-default, all pointing
 * at the current path with an explicit ?lang=. Because the site serves both
 * languages from the same URL, that parameter is what gives each language a
 * distinct, crawlable address.
 */
function syncHreflang(locale: Locale) {
  const { origin, pathname } = window.location;
  // Clears our own tags *and* the ones Next rendered from `alternates.languages`
  // in the root layout, which only ever describe the homepage.
  document.head
    .querySelectorAll("link[rel='alternate'][hreflang]")
    .forEach((node) => node.remove());

  const links: { hreflang: string; href: string }[] = LOCALES.map((code) => ({
    hreflang: LOCALE_META[code].htmlLang,
    href: `${origin}${pathname}?${LOCALE_QUERY_PARAM}=${code}`,
  }));
  links.push({ hreflang: "x-default", href: `${origin}${pathname}` });

  for (const { hreflang, href } of links) {
    const link = document.createElement("link");
    link.setAttribute("rel", "alternate");
    link.setAttribute("hreflang", hreflang);
    link.setAttribute("href", href);
    link.setAttribute("data-i18n-alt", "1");
    document.head.appendChild(link);
  }

  metaByProperty("og:locale", LOCALE_META[locale].ogLocale);
  const alternates = LOCALES.filter((code) => code !== locale).map(
    (code) => LOCALE_META[code].ogLocale,
  );
  document.head
    .querySelectorAll('meta[data-i18n-og-alt="1"]')
    .forEach((node) => node.remove());
  for (const value of alternates) {
    const el = document.createElement("meta");
    el.setAttribute("property", "og:locale:alternate");
    el.setAttribute("content", value);
    el.setAttribute("data-i18n-og-alt", "1");
    document.head.appendChild(el);
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Starts on the default locale so the first client render matches the static
  // HTML the server produced. The effect below switches immediately after
  // hydration if the visitor prefers another language; LocaleScript has already
  // set <html lang/dir> before first paint, so the layout never jumps.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [flat, setFlat] = useState<FlatDictionary>(EN_FLAT);
  const [switching, setSwitching] = useState(false);
  const [pageMeta, setPageMetaState] = useState<PageMetaValue | null>(null);

  // Guards against an out-of-order dictionary chunk overwriting a newer choice.
  const requestRef = useRef(0);

  const applyLocale = useCallback((next: Locale, persist: boolean) => {
    const request = ++requestRef.current;

    if (persist) {
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch {
        /* private mode — the choice just won't survive a reload */
      }
    }

    const cached = getCachedDictionary(next);
    if (cached) {
      setLocaleState(next);
      setFlat(cached);
      return;
    }

    setSwitching(true);
    loadDictionary(next).then((dictionary) => {
      if (request !== requestRef.current) return;
      setLocaleState(next);
      setFlat(dictionary);
      setSwitching(false);
    });
  }, []);

  // First visit / return visit: pick up the language from ?lang=, the saved
  // preference, or the browser — and write it back, so an automatic detection
  // (or a shared ?lang= link) becomes the saved preference from then on. When
  // it resolves to the default this is a no-op render: same locale, same
  // already-cached dictionary, so React bails out of the update.
  useEffect(() => {
    applyLocale(resolveInitialLocale(), true);
  }, [applyLocale]);

  // Keep the document in sync. `lang` is what globals.css keys the Arabic
  // typeface off, and `dir` is what mirrors the whole layout.
  useEffect(() => {
    const meta = LOCALE_META[locale];
    const root = document.documentElement;
    root.setAttribute("lang", meta.htmlLang);
    root.setAttribute("dir", meta.dir);
  }, [locale]);

  // Title, description, Open Graph and hreflang follow the active language.
  useEffect(() => {
    const siteName = readString(flat, "common.brandFull") ?? "Two In One UAE";
    const baseTitle = readString(flat, "meta.title") ?? siteName;
    const baseDescription = readString(flat, "meta.description") ?? "";

    const title = pageMeta?.title ? `${pageMeta.title} | ${siteName}` : baseTitle;
    const description = pageMeta?.description || baseDescription;

    document.title = title;
    metaByName("description", description);
    metaByProperty("og:title", title);
    metaByProperty("og:description", description);
    metaByProperty("og:site_name", siteName);
    metaByName("twitter:title", title);
    metaByName("twitter:description", description);
    syncHreflang(locale);
  }, [flat, locale, pageMeta]);

  const t = useCallback(
    (key: TranslationKey, vars?: TranslationVars) => {
      const value = readString(flat, key) ?? readString(EN_FLAT, key);
      return value === undefined ? key : interpolate(value, vars);
    },
    [flat],
  );

  const tp = useCallback(
    (key: PluralKey, count: number, vars?: TranslationVars) => {
      const category = new Intl.PluralRules(LOCALE_META[locale].htmlLang).select(count);
      const value =
        readString(flat, `${key}_${category}`) ??
        readString(flat, `${key}_other`) ??
        readString(EN_FLAT, `${key}_other`);
      return value === undefined ? key : interpolate(value, { count, ...vars });
    },
    [flat, locale],
  );

  const tList = useCallback(
    (key: TranslationListKey) => {
      const value = flat[key] ?? EN_FLAT[key];
      return Array.isArray(value) ? value : [];
    },
    [flat],
  );

  const tMaybe = useCallback(
    (key: string, fallback: string) => readString(flat, key) ?? fallback,
    [flat],
  );

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      applyLocale(next, true);
    },
    [applyLocale, locale],
  );

  const setPageMeta = useCallback((meta: PageMetaValue | null) => {
    setPageMetaState(meta);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir: LOCALE_META[locale].dir,
      isRtl: LOCALE_META[locale].dir === "rtl",
      switching,
      setLocale,
      t,
      tp,
      tList,
      tMaybe,
      setPageMeta,
    }),
    [locale, switching, setLocale, t, tp, tList, tMaybe, setPageMeta],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return ctx;
}
