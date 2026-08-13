"use client";

import { Plus, Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLocalizedField } from "@/lib/i18n/localized";
import { addonPrice, type KalbaAddon } from "@/lib/kalba/addons";

/**
 * The "would you like anything with that?" list inside a cart row.
 *
 * Shown only for dishes an admin has given extras to, and only once the dish is
 * actually in the cart — asking on the product card would put a decision between
 * the shopper and the one tap they came to make.
 *
 * Nothing is preselected. An untouched list is a shopper who wants the dish as
 * it comes, and that has to be the cheapest outcome, not the default upsell.
 */
export default function AddonPicker({
  addons,
  selected,
  onToggle,
}: {
  addons: KalbaAddon[];
  selected: string[];
  onToggle: (addonId: string) => void;
}) {
  const { t } = useTranslation();
  const pick = useLocalizedField();

  if (addons.length === 0) return null;

  const chosenCount = addons.filter((a) => selected.includes(a.id)).length;

  return (
    <div className="mt-2 pt-2 border-t border-gray-200/70">
      <p className="text-[10px] font-bold text-gray-500 mb-1.5">
        {chosenCount > 0
          ? t("kalba.addons.chosen", { count: chosenCount })
          : t("kalba.addons.prompt")}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {addons.map((addon) => {
          const on = selected.includes(addon.id);
          const price = addonPrice(addon);
          const photo = addon.image_url?.trim();
          return (
            <button
              key={addon.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(addon.id)}
              className={`flex items-center gap-1 pe-2 py-1 rounded-full border text-[10.5px] font-semibold transition-colors ${
                photo ? "ps-1" : "ps-1.5"
              } ${
                on
                  ? "border-orange-400 bg-orange-100 text-orange-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-600"
              }`}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
              ) : on ? (
                <Check size={11} strokeWidth={3} />
              ) : (
                <Plus size={11} strokeWidth={3} />
              )}
              {/* With a photo in the lead slot, the tick moves alongside it. */}
              {photo && on && <Check size={11} strokeWidth={3} className="shrink-0" />}
              <span>{pick(addon, "name")}</span>
              {/* No price is a choice, not a paid extra — "no onions" should not
                  be labelled anything, and certainly not "+AED 0". */}
              {price > 0 && (
                <span className={on ? "text-orange-600" : "text-gray-400"}>
                  {t("kalba.addons.plusPrice", { amount: price })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
