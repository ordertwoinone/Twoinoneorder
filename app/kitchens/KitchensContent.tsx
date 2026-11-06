"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight, Armchair, CheckCircle2, Coffee, Download, Dumbbell, Leaf, Minus, Moon, Plus, ShoppingBag, Star, Sun, X,
  type LucideIcon,
} from "lucide-react";
import ItemOptionsSheet from "@/components/kalba/ItemOptionsSheet";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import type { Kitchen, KitchenDish } from "@/data/kitchenDishes";
import { useBottomBarSpace } from "@/hooks/useBottomBarSpace";
import { addonsTotal, addonSummary, type AddonSelection, type KalbaAddonGroup } from "@/lib/kalba/addons";
import { roundMoney } from "@/lib/kalba/pricing";
import { sortForMenu, type KitchenCategory } from "@/lib/kitchens";
import TableGuestsDialog, { type DiningTable, type Seating } from "./TableGuestsDialog";
import { useLocalizedField } from "@/lib/i18n/localized";
import { useTranslation } from "@/lib/i18n/useTranslation";

const RED = "#b71c24";
const INK = "#211f1c";
const GREEN = "#2f6b1f";
const GREEN_SOFT = "#eaf0e1";
const PAGE_BG = "#f7f5ef";

const SHEET_COLORS = { accent: RED, strong: RED, soft: "#fbe9ea" };

const SEATING_KEY = "kitchens-seating";

const HEADING_FONT = "var(--font-kitchens-heading), var(--font-ar), sans-serif";

/* Lunch and dinner share a tab, so a dish filed under either one appears there. */
type MealTab = "breakfast" | "lunchDinner" | "cafe";
const MEALS: { id: MealTab; icon: LucideIcon }[] = [
  { id: "breakfast", icon: Sun },
  { id: "lunchDinner", icon: Moon },
  { id: "cafe", icon: Coffee },
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
  dish, qty, hasAddons, onAdd, onQtyChange,
}: {
  dish: KitchenDish;
  qty: number;
  hasAddons: boolean;
  onAdd: () => void;
  onQtyChange: (qty: number) => void;
}) {
  const { t } = useTranslation();
  const pick = useLocalizedField();
  const name = pick(dish, "name");

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="relative aspect-[3/2] bg-gray-100">
        {dish.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dish.image} alt={name} loading="lazy" className="h-full w-full object-cover" />
        )}
        {dish.favorite && (
          <span
            role="img"
            aria-label={t("kitchens.favourite")}
            className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-amber-500 shadow sm:end-3 sm:top-3"
          >
            <Star size={15} fill="currentColor" />
          </span>
        )}
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
        <p className="mt-1 text-[11px] leading-relaxed text-gray-500 sm:text-xs">{pick(dish, "description")}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {dish.kcal !== null && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
              style={{ background: GREEN_SOFT, color: GREEN }}
            >
              <Leaf size={13} fill="currentColor" strokeWidth={1} />
              {t("kitchens.kcal", { count: dish.kcal })}
            </span>
          )}
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

        {hasAddons && (
          <p className="mt-2 text-[11px] font-medium text-gray-500">{t("kalba.addons.available")}</p>
        )}

        <div className="mt-auto flex min-h-10 flex-wrap items-center justify-between gap-x-1 gap-y-2 pt-3">
          <Money amount={dish.price} className="text-base text-gray-900 sm:text-lg" />
          {qty > 0 ? (
            <div className="ms-auto">
              <QtyStepper name={name} qty={qty} onChange={onQtyChange} />
            </div>
          ) : (
            <button
              type="button"
              onClick={onAdd}
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
  cart, total, fontClass, seatingLabel, canOrder, placing, orderError, placedNumber, onPlace, onQtyChange, onEdit, onClear, onClose, escapeEnabled,
}: {
  cart: { dish: KitchenDish; qty: number; unit: number; extras: string; hasAddons: boolean }[];
  total: number;
  fontClass: string;
  seatingLabel: string;
  /** False while the page is showing sample dishes, which can't be ordered. */
  canOrder: boolean;
  placing: boolean;
  orderError: string;
  /** Set once the order has gone through. */
  placedNumber: number | null;
  onPlace: () => void;
  onQtyChange: (id: string, qty: number) => void;
  onEdit: (dish: KitchenDish) => void;
  onClear: () => void;
  onClose: () => void;
  /** Off while the add-ons popup is open above this, so Escape only closes that. */
  escapeEnabled: boolean;
}) {
  const { t } = useTranslation();
  const pick = useLocalizedField();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && escapeEnabled) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, escapeEnabled]);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

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
          <div className="min-w-0">
            <h2 id="kitchens-order-title" className="text-xl font-bold text-gray-900" style={{ fontFamily: HEADING_FONT }}>
              {t("kitchens.yourOrder")}
            </h2>
            {seatingLabel && <p className="text-xs text-gray-500">{seatingLabel}</p>}
          </div>
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

        {placedNumber !== null ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle2 size={40} className="mx-auto" style={{ color: GREEN }} />
            <p role="status" className="mt-3 text-base font-semibold text-gray-900">{t("kitchens.orderPlaced", { number: placedNumber })}</p>
            <p className="mt-1 text-sm text-gray-500">{t("kitchens.orderPlacedHint")}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 h-12 w-full rounded-lg text-sm font-semibold text-white hover:opacity-95"
              style={{ background: RED }}
            >
              {t("kitchens.orderDone")}
            </button>
          </div>
        ) : cart.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <ShoppingBag size={32} className="mx-auto text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">{t("kitchens.emptyOrder")}</p>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto px-5">
              {cart.map(({ dish, qty, unit, extras, hasAddons }) => {
                const name = pick(dish, "name");
                return (
                  <li key={dish.id} className="flex items-center gap-3 py-3">
                    {dish.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={dish.image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                      {extras && <p className="text-xs leading-snug text-gray-500">{extras}</p>}
                      {hasAddons && (
                        <button
                          type="button"
                          onClick={() => onEdit(dish)}
                          aria-label={`${t("kalba.addons.edit")} ${name}`}
                          className="block text-xs font-semibold underline"
                          style={{ color: RED }}
                        >
                          {t("kalba.addons.edit")}
                        </button>
                      )}
                      <Money amount={roundMoney(unit * qty)} className="text-sm text-gray-600" />
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
              {canOrder ? (
                <>
                  {orderError && <p role="alert" className="mt-2 text-sm text-red-600">{orderError}</p>}
                  <button
                    type="button"
                    onClick={onPlace}
                    disabled={placing}
                    className="mt-3 h-12 w-full rounded-lg text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
                    style={{ background: RED }}
                  >
                    {placing ? t("kitchens.placingOrder") : t("kitchens.placeOrder")}
                  </button>
                </>
              ) : (
                <p className="mt-2 text-xs text-gray-500">{t("kitchens.previewNote")}</p>
              )}
              <button
                type="button"
                onClick={onClear}
                disabled={placing}
                className="mt-2 w-full rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
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

export default function KitchensContent({
  fontClass, dishes: allDishes, addonGroups, isSample, tables, categories,
}: {
  fontClass: string;
  dishes: KitchenDish[];
  addonGroups: Record<string, KalbaAddonGroup[]>;
  isSample: boolean;
  tables: DiningTable[];
  categories: KitchenCategory[];
}) {
  const { t, tp } = useTranslation();
  const pick = useLocalizedField();
  const [meal, setMeal] = useState<MealTab>("breakfast");
  const [kitchen, setKitchen] = useState<KitchenFilter>("all");
  const [healthyOnly, setHealthyOnly] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [orderOpen, setOrderOpen] = useState(false);
  const [selection, setSelection] = useState<AddonSelection>({});
  const [choosing, setChoosing] = useState<{ dish: KitchenDish; mode: "add" | "edit" } | null>(null);

  const [installed, setInstalled] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [placedNumber, setPlacedNumber] = useState<number | null>(null);
  /* One id per version of the cart: a retry of the same order can't be placed
     twice, and changing the order makes it a new one. */
  const orderRef = useRef("");
  const [seating, setSeating] = useState<Seating | null>(null);
  const [seatingOpen, setSeatingOpen] = useState(false);

  useBottomBarSpace();

  // Starts true so the button doesn't flash inside the installed app.
  useEffect(() => {
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true,
    );
  }, []);

  /* Asked once per visit: a refresh keeps the answer, a fresh open of the link
     asks again. Read here, not in useState, so the server and first client
     render agree. An answer naming a table since removed counts as no answer. */
  useEffect(() => {
    let saved: Seating | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(SEATING_KEY) ?? "null");
    } catch {}
    const stillValid =
      saved &&
      Number.isInteger(saved.guests) &&
      saved.guests >= 1 &&
      (tables.length === 0 || tables.some((x) => x.code === saved?.table));
    if (stillValid) setSeating(saved);
    else setSeatingOpen(true);
  }, [tables]);

  const confirmSeating = (next: Seating) => {
    setSeating(next);
    setSeatingOpen(false);
    try {
      sessionStorage.setItem(SEATING_KEY, JSON.stringify(next));
    } catch {}
  };

  const seatingLabel = seating
    ? [
        seating.table && t("kitchens.tableLabel", { table: seating.table }),
        tp("kitchens.guests", seating.guests),
        seating.waiter && t("kitchens.waiterLabel", { name: seating.waiter }),
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const mealDishes = useMemo(
    () => allDishes.filter((d) => (meal === "lunchDinner" ? d.meal === "lunch" || d.meal === "dinner" : d.meal === meal)),
    [allDishes, meal],
  );

  /* Only the categories with a dish in this meal, so no chip leads to an empty menu. */
  const mealCategories = useMemo(
    () => categories.filter((c) => mealDishes.some((d) => d.categories?.includes(c.id))),
    [categories, mealDishes],
  );
  // The cafe is one menu, so the kitchen buttons don't apply to it.
  const isCafe = meal === "cafe";
  const shownKitchen: KitchenFilter = isCafe ? "all" : kitchen;
  const activeCategory = mealCategories.some((c) => c.id === category) ? category : null;

  const dishes = useMemo(() => {
    const matching = mealDishes.filter(
      (d) =>
        (shownKitchen === "all" || d.kitchen === shownKitchen) &&
        (!healthyOnly || d.healthy) &&
        (!activeCategory || d.categories?.includes(activeCategory)),
    );
    return sortForMenu(matching, seating?.guests ?? null);
  }, [mealDishes, shownKitchen, healthyOnly, activeCategory, seating],
  );

  const cart = useMemo(
    () =>
      allDishes
        .filter((d) => quantities[d.id] > 0)
        .map((dish) => {
          const groups = addonGroups[dish.id] ?? [];
          const chosen = selection[dish.id];
          return {
            dish,
            qty: quantities[dish.id],
            unit: roundMoney(dish.price + addonsTotal(groups, chosen)),
            extras: addonSummary(groups, chosen, (a) => pick(a, "name")),
            hasAddons: groups.length > 0,
          };
        }),
    [allDishes, addonGroups, quantities, selection, pick],
  );
  const total = roundMoney(cart.reduce((sum, line) => sum + line.unit * line.qty, 0));
  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);

  const setQty = (id: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
    // Removed from the order, so adding it again asks the questions afresh.
    if (qty <= 0) setSelection((prev) => ({ ...prev, [id]: [] }));
  };

  /* A dish with add-ons goes through the popup; any other goes straight in. */
  const addDish = (dish: KitchenDish) => {
    if (addonGroups[dish.id]?.length) setChoosing({ dish, mode: "add" });
    else setQty(dish.id, 1);
  };

  useEffect(() => {
    orderRef.current = "";
    setOrderError("");
  }, [quantities, selection]);

  const placeOrder = async () => {
    if (!seating) {
      setOrderOpen(false);
      setSeatingOpen(true);
      return;
    }
    orderRef.current ||= crypto.randomUUID();
    setPlacing(true);
    setOrderError("");
    const res = await fetch("/api/kitchens/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientRef: orderRef.current,
        table: seating.table,
        guests: seating.guests,
        waiterToken: seating.waiterToken ?? null,
        items: cart.map(({ dish, qty }) => ({ dishId: dish.id, qty, addonIds: selection[dish.id] ?? [] })),
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setPlacing(false);
    if (res?.ok && data?.orderNumber) {
      setPlacedNumber(Number(data.orderNumber));
      setQuantities({});
      setSelection({});
      return;
    }
    if (res?.status === 401 && data?.error === "waiter") {
      // The waiter's sign-in ran out: ask for their PIN again, keeping table and guests.
      confirmSeating({ ...seating, waiter: null, waiterToken: null });
      setOrderError(t("kitchens.waiterExpired"));
      setOrderOpen(false);
      setSeatingOpen(true);
      return;
    }
    setOrderError(
      t(res?.status === 409 ? "kitchens.orderChanged" : res?.status === 429 ? "kitchens.orderLimit" : "kitchens.orderFailed"),
    );
  };

  const renderCard = (dish: KitchenDish) => (
    <DishCard
      key={dish.id}
      dish={dish}
      qty={quantities[dish.id] ?? 0}
      hasAddons={(addonGroups[dish.id]?.length ?? 0) > 0}
      onAdd={() => addDish(dish)}
      onQtyChange={(qty) => setQty(dish.id, qty)}
    />
  );

  return (
    <main className={`min-h-screen pb-24 ${fontClass}`} style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        {/* iPhones never offer an install prompt, so this has to be findable. */}
        <div className="mb-2 flex min-h-9 items-center justify-between gap-3">
          <LanguageSwitcher />
          {!installed && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("tio-open-install"))}
              className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900"
            >
              <Download size={14} />
              {t("kitchens.installApp")}
            </button>
          )}
        </div>
        {seating && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white px-3 py-2">
            <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900">
              <Armchair size={16} className="shrink-0" />
              <span className="truncate">{seatingLabel}</span>
            </p>
            <button
              type="button"
              onClick={() => setSeatingOpen(true)}
              className="shrink-0 text-sm font-semibold underline"
              style={{ color: RED }}
            >
              {t("kitchens.change")}
            </button>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2" role="group" aria-label={t("kitchens.mealLabel")}>
          {MEALS.map(({ id, icon: Icon }) => {
            const active = meal === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMeal(id)}
                aria-pressed={active}
                className={`flex h-12 min-w-0 items-center justify-center gap-1 rounded-lg border px-1 text-center text-[13px] leading-tight font-semibold transition-colors min-[375px]:gap-1.5 min-[375px]:text-sm sm:gap-2 sm:text-base ${
                  active ? "border-transparent text-white" : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                }`}
                style={active ? { background: INK } : undefined}
              >
                <Icon size={16} fill="currentColor" className="shrink-0" />
                {t(`kitchens.meals.${id}`)}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-0.5 sm:gap-1" role="group" aria-label={t("kitchens.kitchenLabel")}>
          {!isCafe && KITCHENS.map((id) => {
            const active = kitchen === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setKitchen(id)}
                aria-pressed={active}
                className={`min-h-9 shrink-0 whitespace-nowrap rounded-full px-2.5 text-xs font-medium transition-colors min-[375px]:px-3 min-[375px]:text-[13px] sm:text-sm ${
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
            className="ms-auto inline-flex min-h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold transition-colors min-[375px]:px-3 min-[375px]:text-[13px] sm:ms-1 sm:gap-1.5 sm:text-sm"
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

        {mealCategories.length > 0 && (
          <div
            className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
            role="group"
            aria-label={t("kitchens.categoryLabel")}
          >
            {mealCategories.map((c) => {
              const active = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(active ? null : c.id)}
                  aria-pressed={active}
                  className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition-colors min-[375px]:text-[13px] sm:text-sm ${
                    active ? "border-transparent text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  style={active ? { background: INK } : undefined}
                >
                  {pick(c, "name")}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-black/10">
        <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("kitchens.eyebrow")}</p>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3">
            <h1 className="text-[28px] font-bold leading-tight text-gray-900 sm:text-4xl" style={{ fontFamily: HEADING_FONT }}>
              {t(`kitchens.headings.${meal}`)}
            </h1>
            <p className="shrink-0 text-xs text-gray-500 sm:text-sm">{tp("kitchens.choices", dishes.length)}</p>
          </div>
          {seating && dishes.length > 1 && (
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">{t("kitchens.sortedForParty")}</p>
          )}

          {dishes.length > 0 ? (
            shownKitchen === "all" && !isCafe ? (
              /* Both kitchens: Italian on the left two columns, Turkish on the
                 right two; one column each on a portrait tablet. Stacked on phones. */
              <div className="mt-4 grid grid-cols-1 items-start gap-6 sm:grid-cols-2 sm:gap-4">
                {(["italian", "turkish"] as const).map((id) => {
                  const own = dishes.filter((d) => d.kitchen === id);
                  return (
                    <section key={id} aria-labelledby={`kitchen-${id}`} className="min-w-0">
                      <h2
                        id={`kitchen-${id}`}
                        className="mb-2 text-xl font-bold text-gray-900 sm:text-2xl"
                        style={{ fontFamily: HEADING_FONT }}
                      >
                        {t(`kitchens.origin.${id}`)}
                      </h2>
                      {own.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-4 lg:grid-cols-2">
                          {own.map(renderCard)}
                        </div>
                      ) : (
                        <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500">
                          {t("kitchens.kitchenEmpty")}
                        </p>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 sm:gap-4">
                {dishes.map(renderCard)}
              </div>
            )
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

          <p className="mt-5 text-center text-xs text-gray-500">{t(isSample ? "kitchens.sampleNote" : "kitchens.perServing")}</p>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          onClick={() => setOrderOpen(true)}
          className="pointer-events-auto mx-auto flex h-10 w-fit items-center gap-2.5 rounded-full px-3.5 text-white lg:h-12 lg:w-full lg:max-w-md lg:rounded-lg lg:px-4  shadow-lg transition-opacity hover:opacity-95"
          style={{ background: RED }}
        >
          <span className="relative shrink-0">
            <ShoppingBag size={16} />
            {itemCount > 0 && (
              <span className="absolute -end-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold" style={{ color: RED }}>
                {itemCount}
              </span>
            )}
          </span>
          <span className="whitespace-nowrap text-start text-xs font-semibold lg:flex-1 lg:text-sm">{t("kitchens.viewOrder")}</span>
          <Money amount={total} className="text-xs lg:text-sm" />
          <ArrowRight size={14} className="shrink-0" />
        </button>
      </div>

      {seatingOpen && (
        <TableGuestsDialog
          tables={tables}
          initial={seating}
          fontClass={fontClass}
          headingFont={HEADING_FONT}
          onConfirm={confirmSeating}
          onClose={seating ? () => setSeatingOpen(false) : undefined}
        />
      )}

      {orderOpen && (
        <OrderSheet
          cart={cart}
          total={total}
          fontClass={fontClass}
          seatingLabel={seatingLabel}
          canOrder={!isSample}
          placing={placing}
          orderError={orderError}
          placedNumber={placedNumber}
          onPlace={placeOrder}
          onQtyChange={setQty}
          onEdit={(dish) => setChoosing({ dish, mode: "edit" })}
          onClear={() => {
            setQuantities({});
            setSelection({});
          }}
          onClose={() => {
            setOrderOpen(false);
            setPlacedNumber(null);
          }}
          escapeEnabled={!choosing}
        />
      )}

      {/* Portalled for the same reason as the order sheet. */}
      {choosing &&
        createPortal(
          <ItemOptionsSheet
            key={choosing.dish.id}
            item={{
              id: choosing.dish.id,
              name: pick(choosing.dish, "name"),
              description: pick(choosing.dish, "description"),
              numericPrice: choosing.dish.price,
            }}
            groups={addonGroups[choosing.dish.id] ?? []}
            initialSelection={choosing.mode === "edit" ? selection[choosing.dish.id] : undefined}
            initialQty={choosing.mode === "edit" ? quantities[choosing.dish.id] : 1}
            mode={choosing.mode}
            colors={SHEET_COLORS}
            onConfirm={(chosen, qty) => {
              setSelection((prev) => ({ ...prev, [choosing.dish.id]: chosen }));
              setQty(choosing.dish.id, qty);
              setChoosing(null);
            }}
            onClose={() => setChoosing(null)}
          />,
          document.body,
        )}
    </main>
  );
}
