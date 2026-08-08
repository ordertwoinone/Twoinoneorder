"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLocalized } from "@/lib/i18n/localized";

/**
 * The line under a Top Pick: its price when there is one, otherwise where the
 * dish comes from. Both need the active language — the price so "AED" sits on
 * the right side of the number, the source label so ours are translated while
 * admin-entered ones read exactly as typed.
 */
export default function TopPickSubtitle({
  price,
  subtitleKey,
  subtitle,
  subtitleAr,
}: {
  price: { amount: string; currency: boolean } | null;
  subtitleKey: string | null;
  subtitle: string;
  /** Arabic twin of an admin-entered label; ours translate via `subtitleKey`. */
  subtitleAr?: string | null;
}) {
  const { t, tMaybe } = useTranslation();
  const localized = useLocalized();

  if (price) {
    return <>{price.currency ? t("common.price", { amount: price.amount }) : price.amount}</>;
  }
  return <>{subtitleKey ? tMaybe(subtitleKey, subtitle) : localized(subtitle, subtitleAr)}</>;
}
