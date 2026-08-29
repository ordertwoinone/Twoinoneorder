"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Plus, ShoppingBag } from "lucide-react";
import { KIOSK } from "@/lib/kiosk/theme";
import { toPercent } from "@/lib/kalba/pricing";
import { aed, itemPrice, type KioskQty, type KioskTotals } from "@/lib/kiosk/cart";
import type { KioskCategory, KioskItem, KioskSettings } from "@/lib/kiosk/types";
import ItemCard from "./ItemCard";

/**
 * Step 1 — choosing.
 *
 * Everything is one press deep: the combo across the top, a category rail, a
 * row of filters, and the grid. There is no search box, because a kiosk has no
 * keyboard that the queue behind you will wait for.
 */

const CHEAP_UNDER = 15;

/** How recently a dish has to have been added to still read as new. */
const NEW_FOR_DAYS = 21;

type FilterKey = "all" | "popular" | "cheap" | "veg" | "spicy" | "offers" | "new";

const FILTERS: { key: FilterKey; label: string; test: (i: KioskItem) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "popular", label: "★ Popular", test: (i) => Boolean(i.show_in_top_picks) },
  {
    key: "cheap",
    label: `Under AED ${CHEAP_UNDER}`,
    test: (i) => itemPrice(i) > 0 && itemPrice(i) < CHEAP_UNDER,
  },
  { key: "veg", label: "\u{1F33F} Vegetarian", test: (i) => (i.tags ?? []).includes("veg") },
  { key: "spicy", label: "\u{1F336} Spicy", test: (i) => (i.tags ?? []).includes("spicy") },
  { key: "offers", label: "% Offers", test: (i) => toPercent(i.discount_percent) > 0 },
  {
    key: "new",
    label: "✦ New",
    test: (i) => {
      if (!i.created_at) return false;
      const age = Date.now() - new Date(i.created_at).getTime();
      return age >= 0 && age < NEW_FOR_DAYS * 86_400_000;
    },
  },
];

export default function MenuScreen({
  settings,
  categories,
  items,
  qty,
  totals,
  onAdd,
  onLess,
  onReview,
  onAddCombo,
}: {
  settings: KioskSettings;
  categories: KioskCategory[];
  items: KioskItem[];
  qty: KioskQty;
  totals: KioskTotals;
  onAdd: (item: KioskItem) => void;
  onLess: (item: KioskItem) => void;
  onReview: () => void;
  onAddCombo: () => void;
}) {
  const [category, setCategory] = useState<string>("all");
  const [filter, setFilter] = useState<FilterKey>("all");

  /* Only offer a filter that would find something. A row of chips where four of
     them empty the grid teaches people not to press any of them. */
  const filters = useMemo(
    () => FILTERS.filter((f) => f.key === "all" || items.some(f.test)),
    [items],
  );

  const shown = useMemo(() => {
    const byFilter = FILTERS.find((f) => f.key === filter)?.test ?? (() => true);
    return items.filter((i) => (category === "all" || i.category_id === category) && byFilter(i));
  }, [items, category, filter]);

  const comboReady = settings.combo_enabled && settings.combo_item_ids.length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="kiosk-scroll flex-1 px-[2.4vh] pt-[1.8vh] pb-[2vh]">
        {/* The combo, if one is set up */}
        {comboReady && (
          <div
            className="rounded-[2vh] overflow-hidden relative flex items-stretch mb-[2vh]"
            style={{ background: `linear-gradient(100deg, ${KIOSK.goldSoft} 0%, ${KIOSK.gold} 100%)` }}
          >
            <div className="flex-1 p-[2.2vh] min-w-0">
              <h2 className="font-black text-[3.1vh] leading-none" style={{ color: KIOSK.onGold }}>
                {settings.combo_title}
              </h2>
              <p className="mt-[0.7vh] text-[1.5vh] font-semibold" style={{ color: "#6B5A12" }}>
                {settings.combo_subtitle}
              </p>
              <div className="mt-[1.5vh] flex items-end gap-[1.2vh]">
                <span className="text-[1.4vh] font-bold" style={{ color: "#6B5A12" }}>
                  AED
                </span>
                <span className="font-black leading-none text-[4.4vh]" style={{ color: KIOSK.onGold }}>
                  {Number(settings.combo_price).toFixed(0)}
                </span>
                {Number(settings.combo_save) > 0 && (
                  <span
                    className="rounded-[0.8vh] px-[1vh] py-[0.5vh] text-[1.25vh] font-extrabold mb-[0.4vh]"
                    style={{ background: "#fff", color: KIOSK.onGold }}
                  >
                    Save AED {Number(settings.combo_save).toFixed(0)}
                  </span>
                )}
              </div>
              <button
                onClick={onAddCombo}
                className="mt-[1.6vh] rounded-full px-[2vh] flex items-center gap-[0.8vh] font-bold text-[1.5vh] active:scale-95 transition-transform"
                style={{ background: "#fff", color: KIOSK.onGold, height: "4.4vh" }}
              >
                Add Combo
                <Plus strokeWidth={3} className="w-[1.8vh] h-[1.8vh]" />
              </button>
            </div>
            {settings.combo_image_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={settings.combo_image_url} alt="" className="w-[38%] object-cover shrink-0" />
            )}
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div className="kiosk-scroll flex gap-[1.1vh] overflow-x-auto pb-[1.4vh] -mx-[0.4vh] px-[0.4vh]">
            <CategoryChip
              emoji={"\u{1F37D}️"}
              label="All"
              active={category === "all"}
              onClick={() => setCategory("all")}
            />
            {categories.map((c) => (
              <CategoryChip
                key={c.id}
                emoji={c.emoji}
                label={c.label}
                active={category === c.id}
                onClick={() => setCategory(c.id)}
              />
            ))}
          </div>
        )}

        {/* Filters */}
        {filters.length > 1 && (
          <div className="kiosk-scroll flex gap-[0.9vh] overflow-x-auto py-[1.4vh]">
            {filters.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="rounded-full px-[1.7vh] shrink-0 text-[1.35vh] font-bold whitespace-nowrap active:scale-95 transition-transform"
                  style={{
                    height: "4vh",
                    background: active ? KIOSK.gold : "#fff",
                    color: active ? KIOSK.onGold : KIOSK.inkSoft,
                    border: `0.13vh solid ${active ? KIOSK.gold : KIOSK.line}`,
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        )}

        {/* The grid */}
        {shown.length === 0 ? (
          <div className="py-[10vh] text-center">
            <p className="text-[2vh] font-bold" style={{ color: KIOSK.ink }}>
              Nothing here right now
            </p>
            <p className="mt-[0.8vh] text-[1.5vh]" style={{ color: KIOSK.inkSoft }}>
              Try another category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-[1.2vh] mt-[0.4vh]">
            {shown.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                qty={qty[item.id] ?? 0}
                onAdd={() => onAdd(item)}
                onLess={() => onLess(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* The basket, always in view */}
      <div
        className="shrink-0 px-[2.4vh] py-[1.6vh] flex items-center gap-[1.8vh] bg-white"
        style={{ borderTop: `0.13vh solid ${KIOSK.line}`, boxShadow: "0 -0.6vh 2vh rgba(0,0,0,0.06)" }}
      >
        <div className="relative shrink-0">
          <div
            className="rounded-[1.3vh] flex items-center justify-center w-[5.4vh] h-[5.4vh]"
            style={{ background: KIOSK.goldSoft }}
          >
            <ShoppingBag style={{ color: KIOSK.onGold }} className="w-[2.6vh] h-[2.6vh]" />
          </div>
          {totals.count > 0 && (
            <span
              className="absolute -top-[0.6vh] -right-[0.6vh] rounded-full min-w-[2.4vh] h-[2.4vh] px-[0.6vh] flex items-center justify-center text-[1.25vh] font-black"
              style={{ background: KIOSK.onGold, color: KIOSK.gold }}
            >
              {totals.count}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-bold text-[1.7vh] leading-tight" style={{ color: KIOSK.ink }}>
            My Order
          </p>
          <p className="text-[1.3vh]" style={{ color: KIOSK.inkSoft }}>
            {totals.count === 0
              ? "Nothing added yet"
              : `${totals.count} item${totals.count === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="text-end shrink-0">
          <p className="font-black text-[2.2vh] leading-none" style={{ color: KIOSK.ink }}>
            {aed(totals.subtotal)}
          </p>
          {totals.itemOffers > 0 && (
            <p className="text-[1.2vh] font-semibold mt-[0.4vh]" style={{ color: KIOSK.good }}>
              You save {aed(totals.itemOffers)}
            </p>
          )}
        </div>

        <button
          onClick={onReview}
          disabled={totals.count === 0}
          className="rounded-[1.4vh] px-[2.6vh] flex items-center gap-[1vh] font-black text-[1.9vh] shrink-0 active:scale-95 transition-transform disabled:opacity-35"
          style={{ background: KIOSK.gold, color: KIOSK.onGold, height: "6.2vh" }}
        >
          Review Order
          <ArrowRight strokeWidth={3} className="w-[2.2vh] h-[2.2vh]" />
        </button>
      </div>
    </div>
  );
}

function CategoryChip({
  emoji,
  label,
  active,
  onClick,
}: {
  emoji: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 flex flex-col items-center gap-[0.55vh] rounded-[1.4vh] px-[1.2vh] py-[1vh] w-[10.5vh] active:scale-95 transition-transform"
      style={{
        background: active ? KIOSK.goldSoft : "#fff",
        border: `0.16vh solid ${active ? KIOSK.gold : KIOSK.line}`,
      }}
    >
      <span
        className="rounded-full flex items-center justify-center w-[4.4vh] h-[4.4vh] text-[2.2vh] leading-none"
        style={{ background: active ? "#fff" : "#F7F7F7" }}
      >
        {emoji}
      </span>
      <span
        className="text-[1.12vh] font-bold leading-tight text-center w-full truncate"
        style={{ color: active ? KIOSK.onGold : KIOSK.inkSoft }}
      >
        {label}
      </span>
    </button>
  );
}
