"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight, Dumbbell, Leaf, Minus, Moon, Plus, ShoppingBag, Sun, SunMedium, X,
  type LucideIcon,
} from "lucide-react";
import { kitchenDishes, type Kitchen, type KitchenDish, type Meal } from "@/data/kitchenDishes";
import { useBottomBarSpace } from "@/hooks/useBottomBarSpace";
import { useLocalizedField } from "@/lib/i18n/localized";
import { useTranslation } from "@/lib/i18n/useTranslation";

const RED = "#b71c24";
const INK = "#211f1c";
const GREEN = "#2f6b1f";
const GREEN_SOFT = "#eaf0e1";
const PAGE_BG = "#f7f5ef";

const HEADING_FONT = "var(--font-kitchens-heading), var(--font-ar), sans-serif";

const MEALS: { id: Meal; icon: LucideIcon }[] = [
  { id: "breakfast", icon: Sun },
  { id: "lunch", icon: SunMedium },
  { id: "dinner", icon: Moon },
];

type KitchenFilter = "all" | Kitchen;
const KITCHENS: KitchenFilter[] = ["all", "italian", "turkish"];

/** "AED 36.00" with the currency small and muted, on whichever side the language puts it. */
function Money({ amount, className = "" }: { amount: number; className?: string }) {
  const { t } = useTranslation();
  const value = amount.toFixed(2);
  const [before, after] = t("common.price", { amount: value }).split(value);
  return (
    <span className={`whitespace-nowrap font-bold ${className}`}>
      {before && <span className="text-[0.7em] font-semibold opacity-70">{before}</span>}
      {value}
      {after && <span className="text-[0.7em] font-semibold opacity-70">{after}</span>}
    </span>
  );
}

function QtyStepper({
  name, qty, onChange, size = "md",
}: {
  name: string;
  qty: number;
  onChange: (qty: number) => void;
  size?: "sm" | "md";
}) {
  const { t } = useTranslation();
  const box = size === "md" ? "h-10 w-10" : "h-8 w-8";
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onChange(qty - 1)}
        aria-label={t("kitchens.removeOne", { name })}
        className={`${box} rounded-full border border-gray-300 bg-white text-gray-800 flex items-center justify-center transition-colors hover:bg-gray-100`}
      >
        <Minus size={15} strokeWidth={3} />
      </button>
      <span className="w-6 text-center text-sm font-bold text-gray-900" aria-live="polite">{qty}</span>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        aria-label={t("kitchens.addOne", { name })}
        className={`${box} rounded-full text-white flex items-center justify-center transition-opacity hover:opacity-90`}
        style={{ background: RED }}
      >
        <Plus size={15} strokeWidth={3} />
      </button>
    </div>
  );
}

function DishCard({
  dish, qty, onQtyChange,
}: {
  dish: KitchenDish;
  qty: number;
  onQtyChange: (qty: number) => void;
}) {
  const { t } = useTranslation();
  const pick = useLocalizedField();
  const name = pick(dish, "name");

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="relative aspect-[3/2] bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dish.image} alt={name} loading="lazy" className="h-full w-full object-cover" />
        {dish.badge && (
          <span className="absolute start-2 top-2 rounded-md bg-[#fbf3e4] px-2 py-1 text-[9.5px] font-bold uppercase tracking-wide text-gray-900 sm:start-3 sm:top-3 sm:text-[10.5px]">
            {t(`kitchens.badges.${dish.badge}`)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider sm:text-[11px]" style={{ color: RED }}>
          {t(`kitchens.origin.${dish.kitchen}`)}
        </p>
        <h3 className="mt-1 text-[15px] font-semibold leading-snug text-gray-900 sm:text-lg">{name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-500 sm:text-sm">{pick(dish, "description")}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
            style={{ background: GREEN_SOFT, color: GREEN }}
          >
            <Leaf size={13} fill="currentColor" strokeWidth={1} />
            {t("kitchens.kcal", { count: dish.kcal })}
          </span>
          {dish.healthy && (
            <span
              className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-1 text-[11px] font-semibold"
              style={{ borderColor: GREEN, color: GREEN }}
            >
              <Leaf size={12} fill="currentColor" strokeWidth={1} />
              {t("kitchens.healthyChoice")}
            </span>
          )}
          {dish.highProtein && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700">
              <Dumbbell size={12} />
              {t("kitchens.highProtein")}
            </span>
          )}
        </div>

        <div className="mt-auto flex min-h-10 items-center justify-between gap-1 pt-3">
          <Money amount={dish.price} className={`text-gray-900 ${qty > 0 ? "text-sm" : "text-base sm:text-lg"}`} />
          {qty > 0 ? (
            <QtyStepper name={name} qty={qty} onChange={onQtyChange} size="sm" />
          ) : (
            <button
              type="button"
              onClick={() => onQtyChange(1)}
              aria-label={t("kitchens.addOne", { name })}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
              style={{ background: RED }}
            >
              <Plus size={18} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function OrderSheet({
  cart, total, fontClass, onQtyChange, onClear, onClose,
}: {
  cart: { dish: KitchenDish; qty: number }[];
  total: number;
  fontClass: string;
  onQtyChange: (id: string, qty: number) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const pick = useLocalizedField();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  /* Portalled because app/template.tsx's page-enter wrapper is its own stacking
     context, which would leave the sheet underneath the install prompt (z-60). */
  return createPortal(
    <div className={`fixed inset-0 z-[65] flex items-end justify-center sm:items-center sm:p-6 ${fontClass}`}>
      <button
        type="button"
        aria-label={t("kitchens.closeOrder")}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kitchens-order-title"
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom,0px)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id="kitchens-order-title" className="text-xl font-bold text-gray-900" style={{ fontFamily: HEADING_FONT }}>
            {t("kitchens.yourOrder")}
          </h2>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label={t("kitchens.closeOrder")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <ShoppingBag size={32} className="mx-auto text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">{t("kitchens.emptyOrder")}</p>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto px-5">
              {cart.map(({ dish, qty }) => {
                const name = pick(dish, "name");
                return (
                  <li key={dish.id} className="flex items-center gap-3 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={dish.image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                      <Money amount={dish.price * qty} className="text-sm text-gray-600" />
                    </div>
                    <QtyStepper name={name} qty={qty} onChange={(next) => onQtyChange(dish.id, next)} size="sm" />
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-gray-100 px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-600">{t("kitchens.total")}</span>
                <Money amount={total} className="text-lg text-gray-900" />
              </div>
              <p className="mt-2 text-xs text-gray-500">{t("kitchens.previewNote")}</p>
              <button
                type="button"
                onClick={onClear}
                className="mt-3 w-full rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                {t("kitchens.clearOrder")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default function KitchensContent({ fontClass }: { fontClass: string }) {
  const { t, tp } = useTranslation();
  const [meal, setMeal] = useState<Meal>("dinner");
  const [kitchen, setKitchen] = useState<KitchenFilter>("all");
  const [healthyOnly, setHealthyOnly] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [orderOpen, setOrderOpen] = useState(false);

  useBottomBarSpace();

  const dishes = useMemo(
    () =>
      kitchenDishes.filter(
        (d) =>
          d.meal === meal &&
          (kitchen === "all" || d.kitchen === kitchen) &&
          (!healthyOnly || d.healthy),
      ),
    [meal, kitchen, healthyOnly],
  );

  const cart = useMemo(
    () =>
      kitchenDishes
        .filter((d) => quantities[d.id] > 0)
        .map((dish) => ({ dish, qty: quantities[dish.id] })),
    [quantities],
  );
  const total = cart.reduce((sum, line) => sum + line.dish.price * line.qty, 0);
  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);

  const setQty = (id: string, qty: number) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, qty) }));

  return (
    <main className={`min-h-screen pb-28 ${fontClass}`} style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        <div className="grid grid-cols-3 gap-2" role="group" aria-label={t("kitchens.mealLabel")}>
          {MEALS.map(({ id, icon: Icon }) => {
            const active = meal === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMeal(id)}
                aria-pressed={active}
                className={`flex h-12 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors sm:gap-2 sm:text-base ${
                  active ? "border-transparent text-white" : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                }`}
                style={active ? { background: INK } : undefined}
              >
                <Icon size={17} fill="currentColor" />
                {t(`kitchens.meals.${id}`)}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1" role="group" aria-label={t("kitchens.kitchenLabel")}>
          {KITCHENS.map((id) => {
            const active = kitchen === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setKitchen(id)}
                aria-pressed={active}
                className={`min-h-9 rounded-full px-3 text-sm font-medium transition-colors ${
                  active ? "font-semibold text-white" : "text-gray-500 hover:text-gray-900"
                }`}
                style={active ? { background: RED } : undefined}
              >
                {t(`kitchens.kitchens.${id}`)}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setHealthyOnly((v) => !v)}
            aria-pressed={healthyOnly}
            className="ms-1 inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors"
            style={
              healthyOnly
                ? { background: GREEN, borderColor: GREEN, color: "#fff" }
                : { borderColor: GREEN, color: GREEN }
            }
          >
            <Leaf size={14} fill="currentColor" strokeWidth={1} />
            {t("kitchens.healthy")}
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-black/10">
        <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("kitchens.eyebrow")}</p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl" style={{ fontFamily: HEADING_FONT }}>
              {t(`kitchens.headings.${meal}`)}
            </h1>
            <p className="shrink-0 text-xs text-gray-500 sm:text-sm">{tp("kitchens.choices", dishes.length)}</p>
          </div>

          {dishes.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 sm:gap-4">
              {dishes.map((dish) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  qty={quantities[dish.id] ?? 0}
                  onQtyChange={(qty) => setQty(dish.id, qty)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
              <p className="text-sm text-gray-600">{t("kitchens.noMatches")}</p>
              <button
                type="button"
                onClick={() => {
                  setKitchen("all");
                  setHealthyOnly(false);
                }}
                className="mt-3 text-sm font-semibold underline"
                style={{ color: RED }}
              >
                {t("kitchens.clearFilters")}
              </button>
            </div>
          )}

          <p className="mt-5 text-center text-xs text-gray-500">{t("kitchens.sampleNote")}</p>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          onClick={() => setOrderOpen(true)}
          className="pointer-events-auto mx-auto flex h-14 w-full max-w-2xl items-center gap-3 rounded-xl px-5 text-white shadow-lg transition-opacity hover:opacity-95"
          style={{ background: RED }}
        >
          <span className="relative">
            <ShoppingBag size={22} />
            {itemCount > 0 && (
              <span className="absolute -end-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold" style={{ color: RED }}>
                {itemCount}
              </span>
            )}
          </span>
          <span className="flex-1 text-start font-semibold">{t("kitchens.viewOrder")}</span>
          <Money amount={total} className="text-sm" />
          <ArrowRight size={18} />
        </button>
      </div>

      {orderOpen && (
        <OrderSheet
          cart={cart}
          total={total}
          fontClass={fontClass}
          onQtyChange={setQty}
          onClear={() => setQuantities({})}
          onClose={() => setOrderOpen(false)}
        />
      )}
    </main>
  );
}
