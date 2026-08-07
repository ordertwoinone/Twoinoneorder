"use client";

import { useCallback } from "react";
import { useI18n } from "./I18nProvider";

/**
 * Reading admin-managed content in the active language.
 *
 * Every translatable column in Supabase has an `_ar` twin (see
 * supabase/arabic_translations.sql). English stays the fallback: a blank
 * Arabic field shows the English wording rather than an empty heading, so the
 * site stays usable while translations are being filled in.
 *
 * The choice has to happen on the client — the pages are statically generated,
 * so the server does not know the visitor's language and sends both values.
 */

function choose(isArabic: boolean, en: string | null | undefined, ar: string | null | undefined) {
  if (isArabic && typeof ar === "string" && ar.trim()) return ar;
  return en ?? "";
}

/** Picks between an English and an Arabic value. For attributes and strings. */
export function useLocalized() {
  const { locale } = useI18n();
  const isArabic = locale === "ar";

  return useCallback(
    (en: string | null | undefined, ar?: string | null) => choose(isArabic, en, ar),
    [isArabic],
  );
}

/**
 * Row-shaped twin of useLocalized: `pick(restaurant, "name")` reads `name_ar`
 * when the site is in Arabic and `name` otherwise. Saves naming both columns
 * at every call site.
 */
export function useLocalizedField() {
  const { locale } = useI18n();
  const isArabic = locale === "ar";

  return useCallback(
    // `object` rather than Record<string, unknown>: an interface has no implicit
    // index signature, so the stricter constraint would reject every row type
    // in the app. The `_ar` sibling is read off a cast, since it is by
    // definition not part of the caller's declared key set.
    <T extends object>(row: T | null | undefined, field: Extract<keyof T, string>) => {
      if (!row) return "";
      const rec = row as unknown as Record<string, string | null | undefined>;
      return choose(isArabic, rec[field], rec[`${field}_ar`]);
    },
    [isArabic],
  );
}

/** Same idea for a list column, e.g. restaurants.cuisine / cuisine_ar. */
export function useLocalizedList() {
  const { locale } = useI18n();
  const isArabic = locale === "ar";

  return useCallback(
    (en: string[] | null | undefined, ar?: string[] | null) => {
      if (isArabic && Array.isArray(ar) && ar.length) return ar;
      return en ?? [];
    },
    [isArabic],
  );
}

/**
 * Inline text for the one or two admin-managed strings a *server* component
 * owns, so the section around it can stay on the server:
 *
 *   <L en={r.name} ar={r.name_ar} />
 */
export function L({ en, ar }: { en: string | null | undefined; ar?: string | null }) {
  const { locale } = useI18n();
  return <>{choose(locale === "ar", en, ar)}</>;
}
