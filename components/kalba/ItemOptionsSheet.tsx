"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X, Minus, Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLocalizedField } from "@/lib/i18n/localized";
import {
  addonPrice,
  addonsTotal,
  countChosen,
  defaultSelection,
  firstUnsatisfied,
  isGroupSatisfied,
  isRequired,
  isSingleChoice,
  isSelectionComplete,
  toggleOption,
  type KalbaAddonGroup,
} from "@/lib/kalba/addons";

/**
 * The dish, and the questions that have to be answered before it can be ordered.
 *
 * Opens when a dish with choice groups is added, and again from the cart to
 * change an answer. It owns a draft of the selection rather than editing the
 * cart's copy directly: backing out of the sheet has to leave the cart as it
 * was, and a required group that has been half-answered must not be able to
 * reach the cart at all.
 *
 * Groups are asked in the order admin arranged them, which is the order the
 * kitchen thinks in — sandwich, then side, then drink.
 */

export interface SheetItem {
  id: string;
  name: string;
  description?: string | null;
  /** The dish on its own, before any answers. */
  numericPrice: number;
}

/** The chosen/not-chosen dot, shared by both ways of drawing an option. */
function Tick({ on, className = "" }: { on: boolean; className?: string }) {
  return (
    <span
      className={`w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
        on ? "bg-orange-500 border-orange-500" : "bg-white border-gray-300"
      } ${className}`}
    >
      {on && <Check size={10} strokeWidth={4} className="text-white" />}
    </span>
  );
}

export default function ItemOptionsSheet({
  item,
  groups,
  initialSelection,
  initialQty = 1,
  mode,
  onConfirm,
  onClose,
}: {
  item: SheetItem;
  groups: KalbaAddonGroup[];
  /** What the cart already holds, when reopening to change an answer. */
  initialSelection?: string[];
  initialQty?: number;
  mode: "add" | "edit";
  onConfirm: (selection: string[], qty: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const pick = useLocalizedField();

  /* Keyed by item id so the draft resets when a different dish is opened, and
     seeded with the required single answers so the sheet does not open already
     complaining. */
  const [draft, setDraft] = useState<string[]>(
    () => initialSelection ?? defaultSelection(groups),
  );
  const [qty, setQty] = useState(Math.max(1, initialQty));
  const [showMissing, setShowMissing] = useState(false);

  // The page behind must not scroll while a full-height sheet is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const extras = addonsTotal(groups, draft);
  const unit = item.numericPrice + extras;
  const complete = isSelectionComplete(groups, draft);
  const missing = useMemo(() => firstUnsatisfied(groups, draft), [groups, draft]);

  function toggle(group: KalbaAddonGroup, addonId: string) {
    setDraft((current) => toggleOption({ [item.id]: current }, item.id, group, addonId)[item.id]);
    setShowMissing(false);
  }

  function confirm() {
    if (!complete) {
      setShowMissing(true);
      // Take them to the question they still owe an answer to.
      const el = missing ? document.getElementById(`addon-group-${missing.id}`) : null;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onConfirm(draft, qty);
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={item.name}
      >
        {/* No photo of the dish: they have just tapped its card, so they know
            what it looks like. The sheet is for the choices, and the options'
            own pictures are the ones worth the room. */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-2 shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-gray-900 leading-tight">{item.name}</h2>
            {item.description && (
              <p className="text-[13px] text-gray-500 leading-snug mt-1">{item.description}</p>
            )}
            <p className="text-[15px] font-extrabold mt-1.5" style={{ color: "#ea580c" }}>
              {t("common.price", { amount: item.numericPrice })}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* The questions */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 min-h-0 space-y-4">
          {groups.map((group) => {
            const chosen = countChosen(group, draft);
            const satisfied = isGroupSatisfied(group, draft);
            const single = isSingleChoice(group);
            const flagged = showMissing && !satisfied;

            return (
              <section
                key={group.id}
                id={`addon-group-${group.id}`}
                className={`rounded-2xl border transition-colors ${
                  flagged ? "border-red-300 bg-red-50/40" : "border-gray-100 bg-gray-50/60"
                }`}
              >
                <header className="flex items-start justify-between gap-3 px-3.5 pt-3">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-extrabold text-gray-900 leading-tight">
                      {pick(group, "name")}
                    </h3>
                    <p
                      className={`text-[11.5px] mt-0.5 ${
                        flagged ? "text-red-600 font-semibold" : "text-gray-500"
                      }`}
                    >
                      {satisfied && chosen > 0
                        ? t("kalba.addons.done")
                        : single
                          ? t("kalba.addons.chooseOne")
                          : group.max_select > 0
                            ? t("kalba.addons.chooseUpTo", { count: group.max_select })
                            : t("kalba.addons.chooseAny")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isRequired(group)
                        ? "bg-gray-800 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {isRequired(group) ? t("kalba.addons.required") : t("kalba.addons.optional")}
                  </span>
                </header>

                {/* Tiles when there are photos to show, rows when there are
                    not — a grid of empty grey squares is worse than a list. */}
                {group.options.some((o) => o.image_url?.trim()) ? (
                  <div className="flex gap-2.5 overflow-x-auto px-3.5 py-3">
                    {group.options.map((option) => {
                      const on = draft.includes(option.id);
                      const price = addonPrice(option);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggle(group, option.id)}
                          className={`relative shrink-0 w-[104px] rounded-xl border-2 bg-white p-2 text-start transition-colors ${
                            on ? "border-orange-500" : "border-gray-200 hover:border-orange-300"
                          }`}
                        >
                          <Tick on={on} className="absolute top-1.5 end-1.5" />

                          {option.image_url?.trim() ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={option.image_url}
                              alt=""
                              loading="lazy"
                              className="w-full h-16 object-contain mb-1.5"
                            />
                          ) : (
                            <span className="block w-full h-16 mb-1.5" />
                          )}

                          <span className="block text-[11px] font-bold text-gray-800 leading-tight">
                            {pick(option, "name")}
                          </span>
                          {/* An option included in the price says nothing. */}
                          {price > 0 && (
                            <span className="block text-[10.5px] font-semibold text-orange-600 mt-0.5">
                              {t("kalba.addons.plusPrice", { amount: price })}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3.5 py-3 space-y-1.5">
                    {group.options.map((option) => {
                      const on = draft.includes(option.id);
                      const price = addonPrice(option);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggle(group, option.id)}
                          className={`w-full flex items-center gap-2.5 rounded-xl border-2 bg-white px-3 py-2.5 text-start transition-colors ${
                            on ? "border-orange-500" : "border-gray-200 hover:border-orange-300"
                          }`}
                        >
                          <Tick on={on} />
                          <span className="flex-1 min-w-0 text-[13px] font-bold text-gray-800">
                            {pick(option, "name")}
                          </span>
                          {price > 0 && (
                            <span className="shrink-0 text-[12px] font-semibold text-orange-600">
                              {t("kalba.addons.plusPrice", { amount: price })}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Quantity and the total it makes */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          {showMissing && missing && (
            <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
              {t("kalba.addons.missing", { group: pick(missing, "name") })}
            </p>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-2 py-1.5 shrink-0">
              <button
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                aria-label={t("common.remove")}
                className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 transition-colors"
              >
                <Minus size={14} strokeWidth={3} />
              </button>
              <span className="text-sm font-bold text-gray-900 w-5 text-center">{qty}</span>
              <button
                onClick={() => setQty((n) => n + 1)}
                aria-label={t("common.add")}
                className="w-7 h-7 rounded-full text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                style={{ background: "#ea580c" }}
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>

            <button
              onClick={confirm}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-md transition-opacity ${
                complete ? "hover:opacity-90" : "opacity-60"
              }`}
              style={{ background: "#ea580c" }}
            >
              {mode === "edit" ? t("kalba.addons.saveChoices") : t("common.addToCart")}
              <span className="font-extrabold">{t("common.price", { amount: unit * qty })}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
