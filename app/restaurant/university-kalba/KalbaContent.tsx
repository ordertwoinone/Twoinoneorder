"use client";

import { useState, useCallback, useMemo } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Star,
  Clock,
  Check,
  ChevronRight,
  ShoppingCart,
  Wifi,
  BatteryCharging,
  Armchair,
  Users,
  MoonStar,
  GraduationCap,
  Coffee,
  BookOpen,
  Zap,
  Music,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import FavoriteButton from "@/components/ui/FavoriteButton";
import { useBottomBarSpace } from "@/hooks/useBottomBarSpace";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLocalized, useLocalizedField } from "@/lib/i18n/localized";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface KalbaHero {
  name: string;
  name_ar?: string | null;
  location: string;
  location_ar?: string | null;
  maps_url: string;
  whatsapp: string;
  rating: string;
  rating_count: string;
  rating_count_ar?: string | null;
  delivery_time: string;
  delivery_time_ar?: string | null;
  delivery_fee: string;
  delivery_fee_ar?: string | null;
  is_open: boolean;
  closes_at: string;
  closes_at_ar?: string | null;
  student_title: string;
  student_title_ar?: string | null;
  student_subtitle: string;
  student_subtitle_ar?: string | null;
  student_button: string;
  student_button_ar?: string | null;
  logo_url?: string;
}

export interface KalbaBanner {
  title: string;
  title_ar?: string | null;
  title_highlight: string;
  title_highlight_ar?: string | null;
  subtitle: string;
  subtitle_ar?: string | null;
  image_url: string;
  /* Arabic for a chip lives beside it, so the pair can never drift apart. */
  chips: { emoji: string; line1: string; line2: string; line1_ar?: string; line2_ar?: string }[];
}

export interface KalbaCategory {
  id: string;
  emoji: string;
  label: string;
  label_ar?: string | null;
}

export interface KalbaPopularItem {
  id: string;
  name: string;
  name_ar?: string | null;
  price: string;
  rating: string;
  time_text: string;
  time_text_ar?: string | null;
  image_url: string;
  category_id?: string | null;
  tags?: string[] | null;
}

export interface KalbaStudy {
  title: string;
  title_ar?: string | null;
  subtitle: string;
  subtitle_ar?: string | null;
  image_url: string;
  button_text: string;
  button_text_ar?: string | null;
  features: { icon: string; label: string; label_ar?: string }[];
}

export interface KalbaDailyDeal {
  id: string;
  day: string;
  day_ar?: string | null;
  title: string;
  title_ar?: string | null;
  description: string;
  description_ar?: string | null;
  emoji: string;
  bg_color: string;
  day_color: string;
}

export interface KalbaSpecial {
  id: string;
  name: string;
  name_ar?: string | null;
  description: string;
  description_ar?: string | null;
  price_text: string;
  price_text_ar?: string | null;
  image_url: string;
  category_id?: string | null;
  tags?: string[] | null;
}

/* Softens both ends of the deal ticker so badges slide in and out rather than
   being chopped off at the card edge. */
const EDGE_FADE =
  "linear-gradient(to right, transparent 0, #000 28px, #000 calc(100% - 28px), transparent 100%)";

/** Badges the ticker needs before one pass is wider than any screen it runs on. */
const TICKER_MIN_BADGES = 12;

const DIETARY_TAGS: Record<string, string> = {
  veg: "🥗",
  non_veg: "🍗",
  spicy: "🌶️",
  contains_cheese: "🧀",
};

/**
 * Copy on this page is admin-managed, but the seeded values — and the defaults
 * used when a row is missing entirely — are ours. Mapping those exact strings
 * to dictionary keys means a branch that has never been edited still reads in
 * Arabic, while anything the admin has actually rewritten shows as typed.
 */
const SEEDED_COPY: Record<string, string> = {
  "Two in One University Kalba": "kalba.heroName",
  "Near University of Kalba, Kalba": "kalba.heroLocation",
  "Made for Students,": "kalba.bannerTitle",
  "Loved by Everyone!": "kalba.bannerHighlight",
  "Great food. Better prices. Right on campus.": "kalba.bannerSubtitle",
  "Student Friendly": "kalba.chips.pricingLine1",
  Pricing: "kalba.chips.pricingLine2",
  "Breakfast from": "kalba.chips.breakfastLine1",
  "Lunch Combos from": "kalba.chips.lunchLine1",
  Free: "kalba.chips.wifiLine1",
  WiFi: "kalba.chips.wifiLine2",
  "Study & Chill": "kalba.study.title",
  "The perfect place to eat, study and hangout.": "kalba.study.subtitle",
  "Visit Store": "kalba.study.button",
  "Free WiFi": "kalba.study.wifi",
  "Charging Points": "kalba.study.charging",
  "Indoor Seating": "kalba.study.seating",
  "Group Tables": "kalba.study.groupTables",
  "Open Late": "kalba.study.openLate",
};

interface Props {
  hero: KalbaHero;
  banner: KalbaBanner;
  categories: KalbaCategory[];
  popular: KalbaPopularItem[];
  study: KalbaStudy;
  deals: KalbaDailyDeal[];
  specials: KalbaSpecial[];
}

const STUDY_ICONS: Record<string, LucideIcon> = {
  Wifi, BatteryCharging, Armchair, Users, MoonStar,
  Clock, Star, GraduationCap, Coffee, BookOpen, Zap, Music,
};

function parseNumericPrice(text: string): number {
  const n = parseFloat(text.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

interface CartItem {
  id: string;
  name: string;
  image_url: string;
  priceLabel: string;
  numericPrice: number;
}

interface CouponData {
  id: string;
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  applicable_item_ids: string[];
}

// ─── Components ─────────────────────────────────────────────────────────────

function BranchLogo({ logoUrl }: { logoUrl?: string }) {
  const { t } = useTranslation();
  return (
    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gray-900 flex flex-col items-center justify-center shrink-0 border-2 border-yellow-400 shadow-md overflow-hidden">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={t("buffet.branchLogoAlt")} className="w-full h-full object-cover" />
      ) : (
        <>
          <svg viewBox="0 0 28 16" className="w-7 h-4 mb-0.5" fill="none">
            <path d="M14 2C8 2 2 6.5 2 13L26 13C26 6.5 20 2 14 2Z" fill="#f59e0b" />
            <rect x="2" y="13" width="24" height="2.5" rx="1.25" fill="#f59e0b" />
            <rect x="12.5" y="15.5" width="3" height="3" fill="#f59e0b" />
          </svg>
          <p className="text-white font-bold text-center leading-none" style={{ fontSize: "4.5px" }}>TWO IN ONE</p>
          <p className="text-yellow-400 font-bold text-center leading-none" style={{ fontSize: "4.5px" }}>UNIVERSITY KALBA</p>
        </>
      )}
    </div>
  );
}

function SectionHeader({ title, action, href, internal }: { title: string; action?: string; href?: string; internal?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">{title}</h2>
      {action && href && (
        internal ? (
          <Link href={href}
            className="flex items-center gap-0.5 text-xs font-bold" style={{ color: "#ea580c" }}>
            {action} <ChevronRight size={14} />
          </Link>
        ) : (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-xs font-bold" style={{ color: "#ea580c" }}>
            {action} <ChevronRight size={14} />
          </a>
        )
      )}
    </div>
  );
}

function CartRow({ item, qty, onQtyChange }: {
  item: CartItem;
  qty: number;
  onQtyChange: (id: string, qty: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{item.name}</p>
        <p className="text-[10px] font-bold" style={{ color: "#ea580c" }}>{item.priceLabel}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onQtyChange(item.id, Math.max(0, qty - 1))}
          className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold hover:bg-orange-200 transition-colors"
        >−</button>
        <span className="text-sm font-bold text-gray-900 w-5 text-center">{qty}</span>
        <button
          onClick={() => onQtyChange(item.id, qty + 1)}
          className="w-6 h-6 rounded-full text-white flex items-center justify-center text-sm font-bold hover:opacity-90 transition-opacity"
          style={{ background: "#ea580c" }}
        >+</button>
      </div>
    </div>
  );
}

function CartModal({ items, cartQty, totalQty, totalPrice, members, onMembersChange, onQtyChange, onClose, whatsapp, restaurantName, appliedCoupon, onApplyCoupon, onRemoveCoupon, couponError, couponLoading, discountAmount, finalPrice }: {
  items: CartItem[];
  cartQty: Record<string, number>;
  totalQty: number;
  totalPrice: number;
  members: number;
  onMembersChange: (n: number) => void;
  onQtyChange: (id: string, qty: number) => void;
  onClose: () => void;
  whatsapp: string;
  restaurantName: string;
  appliedCoupon: CouponData | null;
  onApplyCoupon: (code: string) => Promise<void>;
  onRemoveCoupon: () => void;
  couponError: string;
  couponLoading: boolean;
  discountAmount: number;
  finalPrice: number;
}) {
  const { t, tp } = useTranslation();
  const [couponInput, setCouponInput] = useState("");
  const inCart = items.filter((i) => (cartQty[i.id] ?? 0) > 0);

  function buildWaUrl(type: "pickup" | "delivery") {
    const orderLines = inCart
      .map((i) => `• ${i.name} x${cartQty[i.id]} (${i.priceLabel})`)
      .join("\n");
    const lines = [
      t("kalba.wa.order", {
        type: type === "pickup" ? t("kalba.wa.pickupWord") : t("kalba.wa.deliveryWord"),
        restaurant: restaurantName,
      }),
      "",
      orderLines || t("kalba.wa.noItems"),
      "",
      t("kalba.wa.party", { party: tp("common.members", members) }),
    ];
    if (appliedCoupon && discountAmount > 0) {
      lines.push(t("kalba.wa.coupon", { code: appliedCoupon.code, amount: discountAmount }));
      lines.push(t("kalba.wa.total", { total: finalPrice }));
    } else {
      lines.push(t("kalba.wa.total", { total: totalPrice }));
    }
    lines.push(
      "",
      t("kalba.wa.orderType", {
        type: type === "pickup" ? t("kalba.wa.pickupLabel") : t("kalba.wa.deliveryLabel"),
      }),
    );
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  // Save the Kalba order as a booking (labelled "kalba"); links to account if logged in
  function saveKalbaOrder(type: "pickup" | "delivery") {
    const itemsText = inCart.map((i) => `${i.name} x${cartQty[i.id]}`).join(", ");
    const total = appliedCoupon && discountAmount > 0 ? finalPrice : totalPrice;
    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "kalba",
        table_section: restaurantName,
        guests: members,
        // Kept in English: this row is read by staff in the admin panel.
        notes: `${type === "pickup" ? "Pickup" : "Delivery"} order · ${itemsText || "(no items)"} · Total: AED ${total}`,
        status: "pending",
      }),
    }).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col mb-16 sm:mb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-extrabold text-gray-900">{t("kalba.cart.title")}</h2>
            {totalQty > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{totalQty}</span>
            )}
          </div>
          <button onClick={onClose} aria-label={t("common.close")} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Total pill */}
        <div className="px-5 pb-3 shrink-0">
          {totalQty > 0 ? (
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-gray-500">{t("kalba.cart.orderTotal")}</p>
                  <p className="text-sm font-extrabold text-gray-900">{tp("common.items", totalQty)}</p>
                </div>
                <div className="text-end">
                  {discountAmount > 0 ? (
                    <>
                      <p className="text-xs text-gray-400 line-through">{t("common.price", { amount: totalPrice })}</p>
                      <p className="text-lg font-extrabold text-orange-500">{t("common.price", { amount: finalPrice })}</p>
                    </>
                  ) : (
                    <p className="text-lg font-extrabold text-orange-500">{t("common.price", { amount: totalPrice })}</p>
                  )}
                </div>
              </div>
              {discountAmount > 0 && appliedCoupon && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-orange-100">
                  <span className="text-[11px] text-green-600 font-semibold">
                    ✓ {appliedCoupon.code} —{" "}
                    {appliedCoupon.discount_type === "percentage"
                      ? t("kalba.cart.percentOff", { value: appliedCoupon.discount_value })
                      : t("kalba.cart.amountOff", { value: appliedCoupon.discount_value })}
                  </span>
                  <span className="text-[11px] text-green-600 font-bold">{t("kalba.cart.discount", { amount: discountAmount })}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center">
              <p className="text-sm text-gray-400">{t("kalba.cart.emptyTitle")}</p>
              <p className="text-[11px] text-gray-300 mt-0.5">{t("kalba.cart.emptyHint")}</p>
            </div>
          )}
        </div>

        {/* Party size */}
        <div className="px-5 pb-3 shrink-0">
          <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-[11px] text-gray-500 leading-none">{t("kalba.cart.partySize")}</p>
                <p className="text-xs font-bold text-gray-800 mt-0.5">{tp("common.members", members)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onMembersChange(Math.max(1, members - 1))}
                className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-base font-bold hover:bg-orange-200 transition-colors"
              >−</button>
              <span className="text-sm font-extrabold text-gray-900 w-5 text-center">{members}</span>
              <button
                onClick={() => onMembersChange(Math.min(20, members + 1))}
                className="w-7 h-7 rounded-full text-white flex items-center justify-center text-base font-bold hover:opacity-90 transition-opacity"
                style={{ background: "#ea580c" }}
              >+</button>
            </div>
          </div>
        </div>

        {/* Coupon */}
        <div className="px-5 pb-3 shrink-0">
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-green-500 text-base">✓</span>
                <div>
                  <p className="text-xs font-extrabold text-green-700">{appliedCoupon.code}</p>
                  <p className="text-[10px] text-green-600 leading-tight">{appliedCoupon.description || t("kalba.cart.couponApplied")}</p>
                </div>
              </div>
              <button
                onClick={onRemoveCoupon}
                className="text-[11px] text-gray-400 hover:text-red-500 font-semibold transition-colors ms-2 shrink-0"
              >
                {t("common.remove")}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && couponInput.trim() && onApplyCoupon(couponInput.trim())}
                  placeholder={t("kalba.cart.couponPlaceholder")}
                  dir="ltr"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  onClick={() => couponInput.trim() && onApplyCoupon(couponInput.trim())}
                  disabled={!couponInput.trim() || couponLoading}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 transition-opacity shrink-0"
                  style={{ background: "#ea580c" }}
                >
                  {couponLoading ? "…" : t("common.apply")}
                </button>
              </div>
              {couponError && (
                <p className="text-[11px] text-red-500 mt-1.5 px-1">{couponError}</p>
              )}
            </div>
          )}
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-2 min-h-0">
          {inCart.length === 0 ? (
            <div className="py-8 text-center">
              <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">{t("kalba.cart.noItems")}</p>
              <p className="text-[11px] text-gray-300 mt-0.5">{t("kalba.cart.noItemsHint")}</p>
            </div>
          ) : (
            inCart.map((item) => (
              <CartRow key={item.id} item={item} qty={cartQty[item.id] ?? 0} onQtyChange={onQtyChange} />
            ))
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <a
              href={buildWaUrl("pickup")}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { saveKalbaOrder("pickup"); onClose(); }}
              className="flex items-center justify-center gap-1.5 py-3.5 rounded-2xl font-extrabold text-sm border-2 hover:bg-orange-50 transition-colors"
              style={{ borderColor: "#ea580c", color: "#ea580c" }}
            >
              {t("kalba.cart.pickup")}
            </a>
            <a
              href={buildWaUrl("delivery")}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { saveKalbaOrder("delivery"); onClose(); }}
              className="flex items-center justify-center gap-1.5 py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-md hover:opacity-90 transition-opacity"
              style={{ background: "#ea580c" }}
            >
              {t("kalba.cart.delivery")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────

export default function KalbaContent({ hero, banner, popular, study, deals, specials }: Props) {
  const { t, tp, tMaybe } = useTranslation();
  const localized = useLocalized();
  const pick = useLocalizedField();
  /**
   * Arabic typed in admin wins. Failing that, our own seeded English copy is
   * looked up in the dictionary, and anything genuinely custom passes through.
   */
  const copy = (value: string, arabic?: string | null) => {
    const chosen = localized(value, arabic);
    if (chosen !== value) return chosen;
    return value ? tMaybe(SEEDED_COPY[value] ?? "", value) : value;
  };
  const [cartQty, setCartQty] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [members, setMembers] = useState(1);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // Keep the install prompt from landing on the cart bar.
  useBottomBarSpace();

  /**
   * The ticker repeats the deals until one pass is wide enough to cover a desktop
   * viewport, then repeats that whole run once more — the CSS shifts the track by
   * half its width, so the two halves have to be identical for a seamless loop.
   * Speed follows the length, so a short list doesn't race past.
   */
  const [dealTicker, dealTickerSeconds] = useMemo(() => {
    if (deals.length === 0) return [[] as KalbaDailyDeal[], 0] as const;
    const passes = Math.max(1, Math.ceil(TICKER_MIN_BADGES / deals.length));
    const run = Array.from({ length: passes }, () => deals).flat();
    return [[...run, ...run], run.length * 2.6] as const;
  }, [deals]);

  function handleQtyChange(id: string, qty: number) {
    setCartQty((prev) => ({ ...prev, [id]: qty }));
  }

  const allCartItems: CartItem[] = [
    ...popular.map((p) => ({
      id: p.id,
      name: pick(p, "name"),
      image_url: p.image_url,
      priceLabel: `AED ${p.price}`,
      numericPrice: parseFloat(p.price) || 0,
    })),
    ...specials.map((s) => ({
      id: s.id,
      name: pick(s, "name"),
      image_url: s.image_url,
      priceLabel: pick(s, "price_text") || t("kalba.cart.seePrice"),
      numericPrice: parseNumericPrice(s.price_text),
    })),
  ];

  const totalQty = allCartItems.reduce((n, i) => n + (cartQty[i.id] ?? 0), 0);
  const totalPrice = allCartItems.reduce((sum, i) => {
    return sum + i.numericPrice * (cartQty[i.id] ?? 0);
  }, 0);

  // Discount calculation
  let discountAmount = 0;
  if (appliedCoupon && totalPrice > 0) {
    const { discount_type, discount_value, applicable_item_ids } = appliedCoupon;
    let base = totalPrice;
    if (applicable_item_ids.length > 0) {
      base = allCartItems.reduce((sum, i) => {
        if (!applicable_item_ids.includes(i.id)) return sum;
        return sum + i.numericPrice * (cartQty[i.id] ?? 0);
      }, 0);
    }
    discountAmount = discount_type === "percentage"
      ? parseFloat((base * discount_value / 100).toFixed(2))
      : parseFloat(Math.min(discount_value, base).toFixed(2));
  }
  const finalPrice = parseFloat((totalPrice - discountAmount).toFixed(2));

  const handleApplyCoupon = useCallback(async (code: string) => {
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await fetch("/api/kalba/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, cartTotal: totalPrice }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon(data.coupon);
        setCouponError("");
      } else {
        setCouponError(data.error || t("kalba.cart.invalidCoupon"));
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError(t("kalba.cart.couponFailed"));
    } finally {
      setCouponLoading(false);
    }
  }, [totalPrice, t]);

  return (
    <>
      {/* Branch header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5 flex items-center gap-3 sm:gap-4">
          <BranchLogo logoUrl={hero.logo_url} />
          <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base sm:text-xl lg:text-2xl font-extrabold text-gray-900 leading-tight truncate">
              {copy(hero.name, hero.name_ar)}
            </h1>
            <span className="shrink-0 w-[18px] h-[18px] sm:w-5 sm:h-5 rounded-full bg-yellow-400 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={3} />
            </span>
          </div>
          <a href={hero.maps_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-500 mt-0.5 hover:text-[#ea580c] transition-colors">
            <MapPin size={13} className="text-[#ea580c] shrink-0" />
            {copy(hero.location, hero.location_ar)}
          </a>
          <div className="flex items-center gap-1 sm:gap-1.5 mt-1 flex-wrap">
            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-gray-800">{hero.rating}</span>
            <span className="text-xs sm:text-sm text-gray-400">({pick(hero, "rating_count")})</span>
            <span className="text-gray-300 text-xs">·</span>
            <span className="text-xs sm:text-sm text-gray-500">{pick(hero, "delivery_time")}</span>
            <span className="text-gray-300 text-xs">·</span>
            <span className="text-xs sm:text-sm text-gray-500">{pick(hero, "delivery_fee")}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full ${hero.is_open ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {hero.is_open ? t("common.open") : t("common.closed")}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-400">{t("common.closesAt", { time: pick(hero, "closes_at") })}</span>
          </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">

        {/* Hero banner */}
        <div className="mt-4 rounded-3xl overflow-hidden flex flex-col sm:flex-row"
          style={{ background: "linear-gradient(110deg, #fdf3ea 0%, #fae3d1 55%, #f5d2b8 100%)" }}>
          <div className="flex-1 px-5 pt-6 pb-5 sm:p-10 flex flex-col justify-center">
            <h2 className="text-[1.6rem] sm:text-3xl lg:text-4xl font-extrabold leading-[1.15] text-gray-900">
              {copy(banner.title, banner.title_ar)}
              <br />
              <span style={{ color: "#ea580c" }}>{copy(banner.title_highlight, banner.title_highlight_ar)}</span>
            </h2>
            <p className="text-[13px] sm:text-sm text-gray-600 mt-2 mb-5">
              {copy(banner.subtitle, banner.subtitle_ar)}
            </p>
            {banner.chips.length > 0 && (
              <div className="grid grid-cols-4 gap-2 max-w-md">
                {banner.chips.map((c, i) => (
                  <div key={i} className="bg-white rounded-xl px-1.5 py-2.5 text-center shadow-sm">
                    <span className="text-lg sm:text-xl leading-none">{c.emoji}</span>
                    <p className="text-[9px] sm:text-[10px] font-semibold text-gray-600 mt-1 leading-tight">
                      {copy(c.line1, c.line1_ar)}
                      <br />
                      <span className="font-extrabold text-gray-900">{copy(c.line2, c.line2_ar)}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Daily deals ticker */}
        {deals.length > 0 && (
          <div className="mt-5 rounded-3xl border border-gray-100 py-3 overflow-hidden"
            style={{
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              WebkitMaskImage: EDGE_FADE,
              maskImage: EDGE_FADE,
            }}>
            <div className="marquee-track" style={{ "--marquee-duration": `${dealTickerSeconds}s` } as CSSProperties}>
              {dealTicker.map((d, i) => (
                <span key={i} aria-hidden={i >= dealTicker.length / 2}
                  className="flex items-center gap-1.5 shrink-0 me-2.5 rounded-full ps-2.5 pe-3.5 py-1.5 border border-black/[0.04]"
                  style={{ background: d.bg_color }}>
                  <span className="text-base leading-none">{d.emoji}</span>
                  <span className="text-[9.5px] font-bold uppercase tracking-wide leading-none"
                    style={{ color: d.day_color }}>
                    {tMaybe(`kalba.days.${d.day}`, pick(d, "day"))}
                  </span>
                  <span className="text-[11.5px] font-extrabold text-gray-900 leading-none whitespace-nowrap">
                    {pick(d, "title")}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Popular Around Campus */}
        {popular.length > 0 && (
          <section className="mt-7">
            <SectionHeader title={t("kalba.popularTitle")} action={t("common.viewAll")}
              href="/restaurant/university-kalba/menu" internal />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {popular.map((p) => {
                const qty = cartQty[p.id] ?? 0;
                return (
                  <div key={p.id}
                    className="bg-white rounded-2xl overflow-hidden border border-gray-100 block group transition-shadow hover:shadow-md"
                    style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                    <div className="relative h-32 sm:h-36">
                      {p.image_url && (
                        <Image src={p.image_url} alt={p.name} fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw" />
                      )}
                      <span className="absolute top-2 start-2 text-[10px] font-bold px-2 py-0.5 rounded-md text-white z-10"
                        style={{ background: "#ea580c" }}>
                        {t("common.price", { amount: p.price })}
                      </span>
                      <FavoriteButton
                        itemKey={`menu:${p.id}`}
                        name={p.name}
                        imageUrl={p.image_url}
                        href="/restaurant/university-kalba/menu"
                        subtitle={`AED ${p.price}`}
                        className="absolute top-2 end-2 w-7 h-7 z-10"
                      />
                    </div>
                    <div className="px-3 pt-2.5 pb-3">
                      <h3 className="text-gray-900 font-extrabold text-[12.5px] leading-tight mb-1 min-h-[2em]">
                        {pick(p, "name")}
                      </h3>
                      {(p.tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mb-1.5">
                          {(p.tags ?? []).map((t) => {
                            const dt = DIETARY_TAGS[t];
                            return dt ? (
                              <span key={t} className="text-[9px] px-1 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100 font-semibold leading-none">{dt}</span>
                            ) : null;
                          })}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="flex items-center gap-0.5 font-semibold text-gray-700">
                          <Star size={10} className="fill-amber-400 stroke-amber-400" />
                          {p.rating}
                        </span>
                        <span className="flex items-center gap-0.5 text-gray-400">
                          <Clock size={9} />
                          {pick(p, "time_text")}
                        </span>
                      </div>
                      <div className="h-px bg-gray-100 my-1.5" />
                      {qty === 0 ? (
                        <button
                          onClick={() => handleQtyChange(p.id, 1)}
                          className="w-full flex items-center justify-center gap-1 py-1 sm:py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 active:bg-orange-200 transition-colors"
                        >
                          <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span className="text-[10px] sm:text-xs font-semibold">{t("common.add")}</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleQtyChange(p.id, Math.max(0, qty - 1))}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold hover:bg-orange-200 transition-colors"
                          >−</button>
                          <span className="text-xs sm:text-sm font-bold text-gray-900">{qty}</span>
                          <button
                            onClick={() => handleQtyChange(p.id, qty + 1)}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full text-white flex items-center justify-center text-sm font-bold hover:opacity-90 transition-opacity"
                            style={{ background: "#ea580c" }}
                          >+</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Study & Chill */}
        <section className="mt-7 rounded-3xl border border-gray-100 bg-white p-3 sm:p-4 flex flex-col sm:flex-row items-stretch gap-4 sm:gap-8"
          style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          {study.image_url && (
            <div className="relative h-44 sm:h-auto sm:w-[38%] lg:w-[30%] rounded-2xl overflow-hidden shrink-0">
              <Image
                src={study.image_url}
                alt={copy(study.title, study.title_ar)}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 38vw"
              />
            </div>
          )}
          <div className="flex-1 py-1 sm:py-4 px-1 sm:pe-4">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap size={20} className="text-gray-900" />
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">{copy(study.title, study.title_ar)}</h2>
            </div>
            <p className="text-[13px] text-gray-500 mb-5">
              {copy(study.subtitle, study.subtitle_ar)}
            </p>
            {study.features.length > 0 && (
              <div className="flex flex-wrap gap-x-5 sm:gap-x-7 gap-y-4 mb-6">
                {study.features.map((f, i) => {
                  const FeatureIcon = STUDY_ICONS[f.icon] ?? Star;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5 w-16 text-center">
                      <span className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center">
                        <FeatureIcon size={18} className="text-gray-700" />
                      </span>
                      <span className="text-[10px] font-medium text-gray-600 leading-tight">{copy(f.label, f.label_ar)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <a href={hero.maps_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-white text-sm font-bold transition hover:opacity-90"
              style={{ background: "#ea580c" }}>
              {copy(study.button_text, study.button_text_ar) || t("kalba.study.button")} <ChevronRight size={15} />
            </a>
          </div>
        </section>

        {/* Daily Deals */}
        {deals.length > 0 && (
          <section className="mt-7">
            <SectionHeader title={t("kalba.dealsTitle")} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {deals.map((d) => (
                <div key={d.id} className="rounded-2xl p-4 flex flex-col items-center text-center"
                  style={{ background: d.bg_color }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: d.day_color }}>
                    {tMaybe(`kalba.days.${d.day}`, pick(d, "day"))}
                  </p>
                  <p className="text-[13px] font-extrabold text-gray-900 mt-0.5">{pick(d, "title")}</p>
                  <span className="text-3xl my-3">{d.emoji}</span>
                  <p className="text-[11.5px] font-semibold text-gray-600">{pick(d, "description")}</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* Mobile cart bar — clears the bottom nav and the device safe area */}
      <div
        className="fixed left-0 right-0 z-40 px-4 sm:hidden"
        style={{ bottom: "calc(var(--bottom-stack) + 8px)" }}
      >
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 flex items-center px-4 py-3 gap-3">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#ea580c" }}>
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            {totalQty > 0 && (
              <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{totalQty}</span>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-none">{tp("common.items", totalQty)}</p>
            <p className="text-sm font-extrabold text-gray-900 leading-tight">
              {totalQty > 0 ? t("common.price", { amount: totalPrice }) : t("kalba.cart.barEmpty")}
            </p>
          </div>
          <button onClick={() => setCartOpen(true)} className="ms-auto text-white text-sm font-bold px-5 py-2.5 rounded-xl shrink-0 flex items-center gap-2" style={{ background: "#ea580c" }}>
            {t("kalba.cart.viewCart")} <span className="rtl-flip inline-block">→</span>
          </button>
        </div>
      </div>

      {/* Desktop floating cart */}
      <div className="hidden sm:flex fixed bottom-6 end-6 z-40">
        <button onClick={() => setCartOpen(true)} className="flex items-center gap-3 text-white font-bold px-5 py-3.5 rounded-2xl shadow-xl text-sm sm:text-base" style={{ background: "#ea580c" }}>
          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>
            {tp("common.items", totalQty)}
            {totalQty > 0 ? ` · ${t("common.price", { amount: totalPrice })}` : ""}
          </span>
          <span className="bg-white font-bold text-xs sm:text-sm px-3 py-1 rounded-full" style={{ color: "#ea580c" }}>{t("kalba.cart.viewCart")}</span>
        </button>
      </div>

      {/* Cart modal */}
      {cartOpen && (
        <CartModal
          items={allCartItems}
          cartQty={cartQty}
          totalQty={totalQty}
          totalPrice={totalPrice}
          members={members}
          onMembersChange={setMembers}
          onQtyChange={handleQtyChange}
          onClose={() => setCartOpen(false)}
          whatsapp={hero.whatsapp}
          restaurantName={copy(hero.name, hero.name_ar)}
          appliedCoupon={appliedCoupon}
          onApplyCoupon={handleApplyCoupon}
          onRemoveCoupon={() => { setAppliedCoupon(null); setCouponError(""); }}
          couponError={couponError}
          couponLoading={couponLoading}
          discountAmount={discountAmount}
          finalPrice={finalPrice}
        />
      )}
    </>
  );
}
