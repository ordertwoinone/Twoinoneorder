"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";
import { kioskField, type KioskLang } from "@/lib/kiosk/i18n";
import { sizedImage } from "@/lib/image-url";
import { discountedPrice } from "@/lib/kalba/pricing";
import { aed, itemPrice } from "@/lib/kiosk/cart";
import { fetchTio } from "@/lib/kiosk/tio";
import type { KioskItem } from "@/lib/kiosk/types";
import TioAvatar from "./TioAvatar";

/* The basket is asked about once it stops changing, not on every tap of +. */
const SETTLE_MS = 450;

/**
 * "Complete your meal", at the top of the review panel.
 *
 * One dish from what the basket is missing. It is there to be ignored: nothing
 * here blocks Continue, and a meal TIO thinks is complete shows no card at all.
 */
export default function TioCheckout({
  t,
  lang,
  items,
  cart,
  exclude,
  onAdd,
}: {
  t: (key: string) => string;
  lang: KioskLang;
  items: KioskItem[];
  /** Ids in the basket. */
  cart: string[];
  /** Dishes TIO already offered in a pop-up and the customer passed on. */
  exclude: string[];
  onAdd: (item: KioskItem) => void;
}) {
  const [offered, setOffered] = useState<{ item: KioskItem; message: string } | null>(null);
  const cartKey = [...cart].sort().join(",");

  useEffect(() => {
    if (!cartKey) {
      setOffered(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const { reply } = await fetchTio(
        { kind: "checkout", lang, cart: cartKey.split(","), exclude },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const item = items.find((i) => i.id === reply?.itemIds[0]);
      setOffered(item && reply?.message ? { item, message: reply.message } : null);
    }, SETTLE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // A pop-up passed on mid-review is not a reason to swap the card under a finger; only the basket and language re-ask.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, lang, items]);

  /* Added from this card, the suggestion is spent — hidden at once rather than
     left offering what is already in the basket until the next answer lands. */
  const suggestion = offered && !cart.includes(offered.item.id) ? offered : null;

  if (!suggestion) return null;

  return (
    <div
      className="tio-bubble rounded-[1.6vh] px-[1.6vh] py-[1.4vh] mb-[0.6vh] mt-[0.4vh]"
      style={{ background: KIOSK.goldSoft, border: `0.16vh solid ${KIOSK.gold}` }}
    >
      {/* Two rows, not one: a row with the avatar, the message, the dish photo
          and the Add button all beside each other left the message a sliver
          a few characters wide before it ever got to wrap a real sentence.
          The photo and button move to their own row, the width the line
          items below already prove is enough for a dish's worth of text. */}
      <div className="flex items-center gap-[0.8vh]">
        <TioAvatar size="3.6vh" ring={false} />
        <p className="text-[1.15vh] font-extrabold tracking-wide" style={{ color: KIOSK.goldDeep }}>
          {t("tio.suggests")}
        </p>
      </div>
      <div className="flex items-center gap-[1.3vh] mt-[0.8vh]">
        {suggestion.item.image_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={sizedImage(suggestion.item.image_url, 200)}
            alt=""
            className="w-[5.4vh] h-[5.4vh] rounded-[1vh] object-cover shrink-0"
          />
        )}
        <p className="flex-1 min-w-0 text-[1.5vh] font-bold leading-snug" style={{ color: KIOSK.ink }} dir="auto">
          {suggestion.message}
        </p>
        <button
          onClick={() => onAdd(suggestion.item)}
          aria-label={`${t("tio.add")} ${kioskField(lang, suggestion.item, "name")}`}
          className="shrink-0 rounded-[1.1vh] px-[1.4vh] flex flex-col items-center justify-center font-black active:scale-95 transition-transform"
          style={{ background: KIOSK.gold, color: KIOSK.onGold, height: "5.4vh" }}
        >
          <span className="flex items-center gap-[0.4vh] text-[1.5vh]">
            <Plus strokeWidth={3} className="w-[1.6vh] h-[1.6vh]" />
            {t("tio.add")}
          </span>
          <span className="text-[1.05vh] font-bold">
            {aed(discountedPrice(itemPrice(suggestion.item), suggestion.item.discount_percent ?? 0))}
          </span>
        </button>
      </div>
    </div>
  );
}
