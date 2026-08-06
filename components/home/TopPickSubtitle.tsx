"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

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
}: {
  price: { amount: string; currency: boolean } | null;
  subtitleKey: string | null;
  subtitle: string;
}) {
  const { t, tMaybe } = useTranslation();

  if (price) {
    return <>{price.currency ? t("common.price", { amount: price.amount }) : price.amount}</>;
  }
  return <>{subtitleKey ? tMaybe(subtitleKey, subtitle) : subtitle}</>;
}
