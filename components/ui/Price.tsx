"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * A price with its currency on the correct side for the language —
 * "AED 45" in English, "45 د.إ" in Arabic. Small enough to drop into a server
 * component without pulling the rest of the section onto the client.
 */
export default function Price({ amount }: { amount: string | number }) {
  const { t } = useTranslation();
  return <>{t("common.price", { amount })}</>;
}
