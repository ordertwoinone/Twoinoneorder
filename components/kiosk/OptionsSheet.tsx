"use client";

import { useMemo, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";
import { kioskField, type KioskLang } from "@/lib/kiosk/i18n";
import { sizedImage } from "@/lib/image-url";
import { discountedPrice, roundMoney } from "@/lib/kalba/pricing";
import {
  addonPrice,
  addonsTotal,
  defaultSelection,
  firstUnsatisfied,
  isRequired,
  isSelectionComplete,
  isSingleChoice,
  toggleOption,
  type AddonSelection,
} from "@/lib/kalba/addons";
import { itemPrice } from "@/lib/kiosk/cart";
import type { KioskItem } from "@/lib/kiosk/types";

/**
 * The questions a dish comes with, asked at kiosk scale.
 *
 * Everything is a full-width row rather than a radio button, because the target
 * is a finger on a vertical panel and the customer is standing up. The sheet
 * cannot be dismissed into a half-answered state: a required question keeps the
 * Add button off and says which one is still open.
 *
 * It carries its own copy of the answers and hands them back once, so backing
 * out leaves whatever was already in the cart exactly as it was.
 */
export default function OptionsSheet({
  t,
  lang,
  item,
  initialSelection,
  initialQty,
  onCancel,
  onConfirm,
}: {
  t: (key: string) => string;
  lang: KioskLang;
  item: KioskItem;
  /** What this dish already had ticked, when re-opened to change an answer. */
  initialSelection?: string[];
  initialQty?: number;
  onCancel: () => void;
  onConfirm: (selection: string[], qty: number) => void;
}) {
  const groups = useMemo(() => item.addon_groups ?? [], [item]);
  const [selection, setSelection] = useState<AddonSelection>(() => ({
    [item.id]: initialSelection?.length ? initialSelection : defaultSelection(groups),
  }));
  const [qty, setQty] = useState(Math.max(1, initialQty ?? 1));

  const chosen = selection[item.id] ?? [];
  const complete = isSelectionComplete(groups, chosen);
  const missing = firstUnsatisfied(groups, chosen);

  const base = discountedPrice(itemPrice(item), item.discount_percent ?? 0);
  const extras = addonsTotal(groups, chosen);
  const each = roundMoney(base + extras);
  const line = roundMoney(each * qty);

  return (
    <div className="absolute inset-0 z-40 flex flex-col" style={{ background: "rgba(0,0,0,0.45)" }}>
      <button className="flex-1" aria-label="Close" onClick={onCancel} />

      <div className="bg-white rounded-t-[3vh] flex flex-col" style={{ maxHeight: "82%" }}>
        {/* Header */}
        <div
          className="shrink-0 flex items-center gap-[1.6vh] px-[2.4vh] py-[1.8vh]"
          style={{ borderBottom: `0.13vh solid ${KIOSK.line}` }}
        >
          {item.image_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={sizedImage(item.image_url, 200)}
              alt=""
              className="w-[7vh] h-[7vh] rounded-[1.2vh] object-cover shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-black text-[2.4vh] leading-tight" style={{ color: KIOSK.ink }}>
              {kioskField(lang, item, "name")}
            </h2>
            {item.description && (
              <p
                className="text-[1.4vh] mt-[0.4vh] truncate"
                style={{ color: KIOSK.inkSoft }}
              >
                {kioskField(lang, item, "description")}
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="rounded-full w-[5vh] h-[5vh] flex items-center justify-center shrink-0 active:scale-90 transition-transform"
            style={{ background: "#F4F4F4", color: KIOSK.ink }}
          >
            <X strokeWidth={2.5} className="w-[2.4vh] h-[2.4vh]" />
          </button>
        </div>

        {/* The questions */}
        <div className="kiosk-scroll flex-1 px-[2.4vh] py-[1.6vh]">
          {groups.map((group) => {
            const single = isSingleChoice(group);
            return (
              <section key={group.id} className="mb-[2.4vh]">
                <div className="flex items-baseline gap-[1vh] mb-[1.1vh]">
                  <h3 className="font-extrabold text-[1.9vh]" style={{ color: KIOSK.ink }}>
                    {kioskField(lang, group, "name")}
                  </h3>
                  <span
                    className="text-[1.15vh] font-bold rounded-full px-[1vh] py-[0.25vh]"
                    style={
                      isRequired(group)
                        ? { background: "#FEF2F2", color: "#B91C1C" }
                        : { background: "#F4F4F5", color: KIOSK.inkSoft }
                    }
                  >
                    {isRequired(group) ? t("options.required") : t("options.optional")}
                  </span>
                  {!single && group.max_select > 0 && (
                    <span className="text-[1.15vh]" style={{ color: KIOSK.inkSoft }}>
                      {t("options.upTo")} {group.max_select}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-[1vh]">
                  {group.options.map((option) => {
                    const ticked = chosen.includes(option.id);
                    const price = addonPrice(option);
                    return (
                      <button
                        key={option.id}
                        onClick={() =>
                          setSelection((s) => toggleOption(s, item.id, group, option.id))
                        }
                        className="flex items-center gap-[1.2vh] rounded-[1.3vh] px-[1.4vh] py-[1.3vh] text-start active:scale-[0.98] transition-transform"
                        style={{
                          border: `0.16vh solid ${ticked ? KIOSK.gold : KIOSK.line}`,
                          background: ticked ? KIOSK.goldSoft : "#fff",
                        }}
                      >
                        <span
                          className={`shrink-0 flex items-center justify-center w-[2.8vh] h-[2.8vh] ${single ? "rounded-full" : "rounded-[0.7vh]"}`}
                          style={{
                            background: ticked ? KIOSK.gold : "#fff",
                            border: `0.16vh solid ${ticked ? KIOSK.gold : "#D4D4D8"}`,
                            color: KIOSK.onGold,
                          }}
                        >
                          {ticked && <Check strokeWidth={4} className="w-[1.6vh] h-[1.6vh]" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span
                            className="block font-bold text-[1.5vh] leading-tight truncate"
                            style={{ color: KIOSK.ink }}
                          >
                            {kioskField(lang, option, "name")}
                          </span>
                          {price > 0 && (
                            <span
                              className="block text-[1.25vh] font-semibold mt-[0.2vh]"
                              style={{ color: KIOSK.inkSoft }}
                            >
                              + AED {price.toFixed(2)}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* How many, and what that comes to */}
        <div
          className="shrink-0 px-[2.4vh] py-[1.8vh] flex items-center gap-[1.8vh]"
          style={{ borderTop: `0.13vh solid ${KIOSK.line}` }}
        >
          <div
            className="flex items-center gap-[1.6vh] rounded-[1.3vh] px-[1.4vh] shrink-0"
            style={{ border: `0.16vh solid ${KIOSK.line}`, height: "6.2vh" }}
          >
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="One less"
              className="rounded-full w-[3.6vh] h-[3.6vh] flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: KIOSK.goldSoft, color: KIOSK.onGold }}
            >
              <Minus strokeWidth={3} className="w-[1.9vh] h-[1.9vh]" />
            </button>
            <span className="font-black text-[2.2vh] w-[3vh] text-center" style={{ color: KIOSK.ink }}>
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => Math.min(50, q + 1))}
              aria-label="One more"
              className="rounded-full w-[3.6vh] h-[3.6vh] flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: KIOSK.gold, color: KIOSK.onGold }}
            >
              <Plus strokeWidth={3} className="w-[1.9vh] h-[1.9vh]" />
            </button>
          </div>

          <button
            onClick={() => onConfirm(chosen, qty)}
            disabled={!complete}
            className="flex-1 rounded-[1.4vh] flex items-center justify-center gap-[1.2vh] font-black text-[2vh] active:scale-[0.98] transition-transform disabled:opacity-40"
            style={{ background: KIOSK.gold, color: KIOSK.onGold, height: "6.2vh" }}
          >
            {complete ? (
              <>
                {t("options.add")}
                <span className="opacity-70">·</span>
                AED {line.toFixed(2)}
              </>
            ) : (
              `${t("options.choose")} ${missing ? kioskField(lang, missing, "name") : ""}`.trim()
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
