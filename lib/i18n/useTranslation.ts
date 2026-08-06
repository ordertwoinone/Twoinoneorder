"use client";

import { useI18n } from "./I18nProvider";

/**
 * The hook every component uses to read copy.
 *
 *   const { t, tp } = useTranslation();
 *   t("nav.home")                        → "Home"      / "الرئيسية"
 *   t("footer.rights", { year: 2026 })   → interpolates {year}
 *   tp("common.items", 3)                → picks the right plural branch
 *   tList("pwa.android")                 → an ordered list of strings
 */
export function useTranslation() {
  const { t, tp, tList, tMaybe, locale, dir, isRtl, setLocale, switching } = useI18n();
  return { t, tp, tList, tMaybe, locale, dir, isRtl, setLocale, switching };
}
