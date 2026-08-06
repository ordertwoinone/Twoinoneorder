"use client";

import { useI18n } from "./I18nProvider";
import type { PluralKey, TranslationKey, TranslationVars } from "./types";

/**
 * Inline translated text, for the one or two strings a server component owns.
 * It keeps the surrounding section on the server (so its Supabase query still
 * runs there and the markup is still cached) while the words themselves follow
 * the visitor's language.
 *
 *   <h2><T k="home.restaurantsTitle" /></h2>
 *
 * When a component needs translated *attributes* — a placeholder, an alt, an
 * aria-label — reach for useTranslation() in a client component instead.
 */
export function T({ k, vars }: { k: TranslationKey; vars?: TranslationVars }) {
  const { t } = useI18n();
  return <>{t(k, vars)}</>;
}

/** Plural-aware twin of <T>: <TP k="common.items" count={n} />. */
export function TP({
  k,
  count,
  vars,
}: {
  k: PluralKey;
  count: number;
  vars?: TranslationVars;
}) {
  const { tp } = useI18n();
  return <>{tp(k, count, vars)}</>;
}
