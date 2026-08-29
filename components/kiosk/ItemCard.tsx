"use client";

import { Clock, Minus, Plus, Star } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";
import { discountedPrice, toPercent } from "@/lib/kalba/pricing";
import type { KioskItem } from "@/lib/kiosk/types";
import { itemPrice } from "@/lib/kiosk/cart";

/** The corner flash on a card, at most one, strongest claim first. */
export function itemBadge(item: KioskItem): { text: string; bg: string; fg: string } | null {
  const offer = toPercent(item.discount_percent);
  if (offer > 0) return { text: `${offer}% OFF`, bg: KIOSK.good, fg: "#fff" };
  if (item.show_in_top_picks) return { text: "BEST SELLER", bg: KIOSK.gold, fg: KIOSK.onGold };
  if ((item.tags ?? []).includes("spicy")) return { text: "SPICY", bg: "#EF4444", fg: "#fff" };
  if ((item.tags ?? []).includes("veg")) return { text: "VEG", bg: "#15803D", fg: "#fff" };
  return null;
}

/**
 * One dish, as a card in the grid.
 *
 * A dish that asks questions — a choice of side, extra cheese — always shows
 * the plus, never the stepper: tapping + on a second helping would silently
 * copy the first one's answers, and nobody at a kiosk expects that. Tapping it
 * opens the options sheet again instead.
 */
export default function ItemCard({
  item,
  qty,
  onAdd,
  onLess,
}: {
  item: KioskItem;
  qty: number;
  onAdd: () => void;
  onLess: () => void;
}) {
  const list = itemPrice(item);
  const offer = toPercent(item.discount_percent);
  const net = discountedPrice(list, offer);
  const badge = itemBadge(item);
  const asks = (item.addon_groups ?? []).length > 0;

  return (
    <div
      className="rounded-[1.7vh] overflow-hidden flex flex-col bg-white"
      style={{
        border: `0.13vh solid ${qty > 0 ? KIOSK.gold : KIOSK.line}`,
        boxShadow: qty > 0 ? `0 0 0 0.2vh ${KIOSK.gold}55` : "0 0.2vh 0.8vh rgba(0,0,0,0.04)",
      }}
    >
      <div className="relative w-full" style={{ aspectRatio: "4 / 3", background: "#F6F6F6" }}>
        {item.image_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        )}
        {badge && (
          <span
            className="absolute top-[0.7vh] left-[0.7vh] rounded-[0.6vh] px-[0.8vh] py-[0.35vh] text-[0.95vh] font-extrabold tracking-wide"
            style={{ background: badge.bg, color: badge.fg }}
          >
            {badge.text}
          </span>
        )}
        {qty > 0 && (
          <span
            className="absolute top-[0.7vh] right-[0.7vh] rounded-full min-w-[2.4vh] h-[2.4vh] px-[0.6vh] flex items-center justify-center text-[1.2vh] font-black"
            style={{ background: KIOSK.onGold, color: KIOSK.gold }}
          >
            {qty}
          </span>
        )}
      </div>

      <div className="px-[1vh] pt-[0.9vh] pb-[1vh] flex flex-col flex-1">
        <p
          className="font-bold leading-tight text-[1.4vh] mb-[0.6vh]"
          style={{
            color: KIOSK.ink,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: "3.4vh",
          }}
        >
          {item.name}
        </p>

        <div className="flex items-center gap-[0.9vh] text-[1.05vh] mb-[0.9vh]" style={{ color: KIOSK.inkSoft }}>
          <span className="flex items-center gap-[0.3vh] font-semibold">
            <Star className="fill-amber-400 stroke-amber-400 w-[1.2vh] h-[1.2vh]" />
            {item.rating}
          </span>
          {item.time_text && (
            <span className="flex items-center gap-[0.3vh]">
              <Clock className="w-[1.1vh] h-[1.1vh]" />
              {item.time_text}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-[0.6vh]">
          <div className="leading-none min-w-0">
            <span className="font-black text-[1.5vh]" style={{ color: KIOSK.ink }}>
              AED {net.toFixed(2)}
            </span>
            {offer > 0 && (
              <span className="ms-[0.5vh] text-[1vh] line-through" style={{ color: "#9CA3AF" }}>
                {list.toFixed(2)}
              </span>
            )}
          </div>

          {qty > 0 && !asks ? (
            <div className="flex items-center gap-[0.5vh] shrink-0">
              <button
                onClick={onLess}
                aria-label={`One less ${item.name}`}
                className="rounded-full w-[3vh] h-[3vh] flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: KIOSK.goldSoft, color: KIOSK.onGold }}
              >
                <Minus strokeWidth={3} className="w-[1.5vh] h-[1.5vh]" />
              </button>
              <button
                onClick={onAdd}
                aria-label={`One more ${item.name}`}
                className="rounded-full w-[3vh] h-[3vh] flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: KIOSK.gold, color: KIOSK.onGold }}
              >
                <Plus strokeWidth={3} className="w-[1.5vh] h-[1.5vh]" />
              </button>
            </div>
          ) : (
            <button
              onClick={onAdd}
              aria-label={`Add ${item.name}`}
              className="rounded-full w-[3.2vh] h-[3.2vh] flex items-center justify-center shrink-0 active:scale-90 transition-transform"
              style={{ background: KIOSK.gold, color: KIOSK.onGold }}
            >
              <Plus strokeWidth={3} className="w-[1.9vh] h-[1.9vh]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
