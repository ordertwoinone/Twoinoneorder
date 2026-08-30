"use client";

import { useState } from "react";
import { Minus, Plus, UtensilsCrossed } from "lucide-react";
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
 * Read standing up, at arm's length, by someone who is deciding rather than
 * browsing — so the photograph carries the card and the price is the second
 * thing the eye lands on. The rating and prep time that were here are gone:
 * nobody at a counter is choosing between two dishes on 4.5 versus 4.6, and
 * they were crowding the two things that matter.
 *
 * A dish that asks questions — a choice of side, extra cheese — always shows
 * the plus, never the stepper: tapping + on a second helping would silently
 * copy the first one's answers, and nobody at a kiosk expects that.
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
  /* A photo that 404s must not leave a grey hole in the grid — the card falls
     back to a plain tile that still reads as the dish. */
  const [imageOk, setImageOk] = useState(true);

  const list = itemPrice(item);
  const offer = toPercent(item.discount_percent);
  const net = discountedPrice(list, offer);
  const badge = itemBadge(item);
  const asks = (item.addon_groups ?? []).length > 0;
  const chosen = qty > 0;

  return (
    <button
      onClick={onAdd}
      className="group relative text-start rounded-[1.8vh] flex flex-col bg-white active:scale-[0.98] transition-transform"
      style={{
        border: `0.18vh solid ${chosen ? KIOSK.gold : KIOSK.line}`,
        boxShadow: chosen
          ? `0 0 0 0.25vh ${KIOSK.gold}44, 0 0.4vh 1.2vh rgba(0,0,0,0.07)`
          : "0 0.25vh 1vh rgba(0,0,0,0.05)",
      }}
    >
      {/* ─── The photograph ─── */}
      <div
        className="relative w-full shrink-0"
        style={{
          aspectRatio: "1 / 1",
          background: "#F4F4F5",
          /* Only the photo clips — the add button hangs off its bottom edge and
             would be sliced in half by an overflow rule on the card. */
          borderRadius: "1.62vh 1.62vh 0 0",
        }}
      >
        {item.image_url && imageOk ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.image_url}
            alt=""
            loading="lazy"
            onError={() => setImageOk(false)}
            className="w-full h-full object-cover"
            style={{ borderRadius: "inherit" }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(140deg, ${KIOSK.goldSoft}, #F4F4F5)`,
              borderRadius: "inherit",
            }}
          >
            <UtensilsCrossed className="w-[3.4vh] h-[3.4vh]" style={{ color: "#C9BE96" }} />
          </div>
        )}

        {badge && (
          <span
            className="absolute top-[0.8vh] left-[0.8vh] rounded-[0.7vh] px-[0.9vh] py-[0.4vh] text-[1.02vh] font-extrabold tracking-wide"
            style={{ background: badge.bg, color: badge.fg }}
          >
            {badge.text}
          </span>
        )}

        {/* How many are in the basket, over the photo where it cannot be missed. */}
        {chosen && (
          <span
            className="absolute top-[0.8vh] right-[0.8vh] rounded-full min-w-[2.8vh] h-[2.8vh] px-[0.7vh] flex items-center justify-center text-[1.4vh] font-black"
            style={{ background: KIOSK.onGold, color: KIOSK.gold }}
          >
            {qty}
          </span>
        )}

        {/* The controls sit on the photo rather than beside the price: on a
            250px-wide card the two competed for the same line and "AED" ended
            up clipped behind the button. The whole card adds, so these only
            adjust what is already in the basket — hence stopPropagation. */}
        <span className="absolute -bottom-[1.8vh] right-[0.8vh] flex items-center gap-[0.5vh]">
          {chosen && !asks && (
            <span
              role="button"
              aria-label={`One less ${item.name}`}
              onClick={(e) => { e.stopPropagation(); onLess(); }}
              className="rounded-full w-[3.6vh] h-[3.6vh] flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: "#fff", color: KIOSK.onGold, border: `0.18vh solid ${KIOSK.gold}` }}
            >
              <Minus strokeWidth={3} className="w-[1.8vh] h-[1.8vh]" />
            </span>
          )}
          <span
            aria-hidden
            className="rounded-full w-[3.6vh] h-[3.6vh] flex items-center justify-center"
            style={{ background: KIOSK.gold, color: KIOSK.onGold, boxShadow: "0 0.2vh 0.8vh rgba(0,0,0,0.18)" }}
          >
            <Plus strokeWidth={3} className="w-[2.1vh] h-[2.1vh]" />
          </span>
        </span>
      </div>

      {/* ─── Name and price ─── */}
      <div className="px-[1.1vh] pt-[2.4vh] pb-[1.2vh] flex flex-col flex-1 w-full">
        <p
          className="font-bold leading-tight text-[1.4vh] mb-[0.8vh]"
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

        <p className="mt-auto flex items-baseline gap-[0.6vh] leading-none">
          <span className="font-black text-[1.7vh] whitespace-nowrap" style={{ color: KIOSK.ink }}>
            <span className="text-[1.1vh] me-[0.35vh]" style={{ color: KIOSK.inkSoft }}>AED</span>
            {net.toFixed(2)}
          </span>
          {offer > 0 && (
            <span className="text-[1.1vh] line-through" style={{ color: "#B0B0B8" }}>
              {list.toFixed(2)}
            </span>
          )}
        </p>
      </div>
    </button>
  );
}
