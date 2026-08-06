"use client";

import { useEffect } from "react";
import { useI18n } from "./I18nProvider";
import type { TranslationKey } from "./types";

/**
 * Claims the document title and meta description for the route it is mounted
 * on, in the active language.
 *
 * Next's own `metadata` export still ships the English copy in the server HTML
 * — that is what crawlers and link unfurlers read first. This keeps the live
 * document in step once a visitor is browsing in Arabic, and hands the title
 * back to the site default when the route unmounts.
 */
export default function PageMeta({
  titleKey,
  descriptionKey,
}: {
  titleKey?: TranslationKey;
  descriptionKey?: TranslationKey;
}) {
  const { t, setPageMeta } = useI18n();

  useEffect(() => {
    setPageMeta({
      title: titleKey ? t(titleKey) : undefined,
      description: descriptionKey ? t(descriptionKey) : undefined,
    });
    return () => setPageMeta(null);
  }, [t, titleKey, descriptionKey, setPageMeta]);

  return null;
}
