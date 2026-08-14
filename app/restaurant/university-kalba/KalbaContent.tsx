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
import ItemOptionsSheet from "@/components/kalba/ItemOptionsSheet";
import {
  addonsTotal, addonSummary, defaultSelection,
  type AddonSelection, type KalbaAddonGroup,
} from "@/lib/kalba/addons";
import { useBottomBarSpace } from "@/hooks/useBottomBarSpace";
import { useStudentCard } from "@/hooks/useStudentCard";
import { STUDENT_DISCOUNT_PERCENT, studentDiscountAmount } from "@/lib/student-card";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { pickupSlots, slotDateValue, slotTimeValue, slotLabel, type DayHours } from "@/lib/pickup-slots";
import { useLocalized, useLocalizedField } from "@/lib/i18n/localized";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface KalbaHero {
  name: string;
  /** Minutes the kitchen needs before an order can be collected. */
  pickup_lead_minutes?: number | null;
  /** The weekly schedule; empty falls back to closes_at. */
  opening_hours?: DayHours[] | null;
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
  /** A line under the name on the card. Blank for most items. */
  description?: string | null;
  description_ar?: string | null;
  price: string;
  rating: string;
  time_text: string;
  time_text_ar?: string | null;
  image_url: string;
  category_id?: string | null;
  tags?: string[] | null;
  /** Choice groups from admin → Popular Around Campus; empty for most dishes. */
  addon_groups?: KalbaAddonGroup[] | null;
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
  description?: string | null;
  image_url: string;
  priceLabel: string;
  numericPrice: number;
  /** Questions asked before this dish is ordered. Empty for most of them. */
  groups: KalbaAddonGroup[];
}

/** What one of this dish costs once the chosen options are counted. */
function unitPrice(item: CartItem, selection: AddonSelection): number {
  return item.numericPrice + addonsTotal(item.groups, selection[item.id]);
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

function CartRow({ item, qty, selectedAddons, onQtyChange, onEditOptions }: {
  item: CartItem;
  qty: number;
  selectedAddons: string[];
  onQtyChange: (id: string, qty: number) => void;
  onEditOptions: (itemId: string) => void;
}) {
  const { t } = useTranslation();
  const pick = useLocalizedField();
  const extras = addonsTotal(item.groups, selectedAddons);
  const chosen = addonSummary(item.groups, selectedAddons, (a) => pick(a, "name"));

  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
          {item.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{item.name}</p>
          <p className="text-[10px] font-bold" style={{ color: "#ea580c" }}>
            {item.priceLabel}
            {/* The extras are priced separately so the dish price stays honest. */}
            {extras > 0 && (
              <span className="text-gray-500 font-semibold">
                {" "}{t("kalba.addons.plusExtras", { amount: extras })}
              </span>
            )}
          </p>
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

      {/* What they chose, and the way back to change it. */}
      {item.groups.length > 0 && (
        <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-200/70">
          <p className="flex-1 min-w-0 text-[10.5px] text-gray-500 leading-snug">
            {chosen || t("kalba.addons.customise")}
          </p>
          <button
            onClick={() => onEditOptions(item.id)}
            className="shrink-0 text-[10.5px] font-bold text-orange-600 hover:underline"
          >
            {t("kalba.addons.edit")}
          </button>
        </div>
      )}
    </div>
  );
}

function CartModal({ items, cartQty, cartAddons, totalQty, totalPrice, onQtyChange, onEditOptions, onClose, whatsapp, restaurantName, pickupLeadMinutes, closesAt, openingHours, isOpen, appliedCoupon, onApplyCoupon, onRemoveCoupon, couponError, couponLoading, discountAmount, studentDiscount, studentPercent, finalPrice }: {
  items: CartItem[];
  cartQty: Record<string, number>;
  /** Which extras are ticked, per item. */
  cartAddons: AddonSelection;
  totalQty: number;
  totalPrice: number;
  onQtyChange: (id: string, qty: number) => void;
  onEditOptions: (itemId: string) => void;
  onClose: () => void;
  whatsapp: string;
  restaurantName: string;
  pickupLeadMinutes: number;
  closesAt: string;
  openingHours: DayHours[];
  /** The sudden-close switch from Branch Info. */
  isOpen: boolean;
  appliedCoupon: CouponData | null;
  onApplyCoupon: (code: string) => Promise<void>;
  onRemoveCoupon: () => void;
  couponError: string;
  couponLoading: boolean;
  discountAmount: number;
  /** Taken off by the shopper's Student Privilege Card; 0 without one. */
  studentDiscount: number;
  studentPercent: number;
  finalPrice: number;
}) {
  const { t, tp } = useTranslation();
  const [couponInput, setCouponInput] = useState("");
  /* Delivery asks where to before it sends: the kitchen reading the WhatsApp
     message has no way to chase an address that never arrived. */
  const [askingPickup, setAskingPickup] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  /* Rebuilt each time the form opens: a sheet left sitting for twenty minutes
     would otherwise still offer times that have since passed. */
  const slots = useMemo(
    () =>
      askingPickup
        ? pickupSlots(pickupLeadMinutes, new Date(), { hours: openingHours, closesAt, isOpen })
        : [],
    [askingPickup, pickupLeadMinutes, openingHours, closesAt, isOpen],
  );

  /* A number worth messaging back on: seven digits is the shortest a UAE
     number gets once the leading zero or country code is stripped. */
  const pickupReady =
    name.trim().length > 0 && phone.replace(/\D/g, "").length >= 7 && pickupAt !== "";
  const [askingAddress, setAskingAddress] = useState(false);
  const [address, setAddress] = useState("");
  const [mapPin, setMapPin] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const inCart = items.filter((i) => (cartQty[i.id] ?? 0) > 0);

  /* A dropped pin says more than a typed address in an area where streets go
     unnamed — but it is an extra, never a replacement for the written one. */
  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationNote(t("kalba.cart.locationFailed"));
      return;
    }
    setLocating(true);
    setLocationNote(t("kalba.cart.locating"));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        setMapPin(`https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`);
        setLocationNote(t("kalba.cart.locationAdded"));
        setLocating(false);
      },
      () => {
        setLocationNote(t("kalba.cart.locationFailed"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  /* The kitchen reads this, so the extras have to be on the line they belong to
     rather than summarised at the bottom. */
  function orderLineFor(item: CartItem): string {
    const extras = addonSummary(item.groups, cartAddons[item.id], (a) => a.name);
    const base = `• ${item.name} x${cartQty[item.id]} (${item.priceLabel})`;
    return extras ? `${base}\n   ↳ ${t("kalba.addons.waLine", { extras })}` : base;
  }

  function buildWaUrl(type: "pickup" | "delivery") {
    const orderLines = inCart.map(orderLineFor).join("\n");
    const lines = [
      t("kalba.wa.order", {
        type: type === "pickup" ? t("kalba.wa.pickupWord") : t("kalba.wa.deliveryWord"),
        restaurant: restaurantName,
      }),
      "",
      orderLines || t("kalba.wa.noItems"),
      "",
    ];
    if (type === "pickup" && pickupReady) {
      lines.push(t("kalba.wa.customer", { name: name.trim() }));
      lines.push(t("kalba.wa.phone", { phone: phone.trim() }));
      if (pickupAt) lines.push(t("kalba.wa.pickupAt", { time: slotLabel(new Date(pickupAt)) }));
      lines.push("");
    }
    if (type === "delivery" && address.trim()) {
      lines.push(t("kalba.wa.address", { address: address.trim() }));
      if (mapPin) lines.push(t("kalba.wa.mapPin", { link: mapPin }));
      lines.push("");
    }
    if (appliedCoupon && discountAmount > 0) {
      lines.push(t("kalba.wa.coupon", { code: appliedCoupon.code, amount: discountAmount }));
    }
    if (studentDiscount > 0) {
      lines.push(t("kalba.wa.student", { percent: studentPercent, amount: studentDiscount }));
    }
    lines.push(
      t("kalba.wa.total", {
        total: discountAmount > 0 || studentDiscount > 0 ? finalPrice : totalPrice,
      }),
    );
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
    const itemsText = inCart
      .map((i) => {
        // Kept in English with the rest of this row — staff read it in admin.
        const extras = addonSummary(i.groups, cartAddons[i.id], (a) => a.name);
        return `${i.name} x${cartQty[i.id]}${extras ? ` (+ ${extras})` : ""}`;
      })
      .join(", ");
    const total = discountAmount > 0 || studentDiscount > 0 ? finalPrice : totalPrice;
    const where = type === "delivery" && address.trim()
      ? ` · Deliver to: ${address.trim()}${mapPin ? ` (${mapPin})` : ""}`
      : "";
    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "kalba",
        table_section: restaurantName,
        // Blank until now, which left every Kalba order nameless in Bookings.
        guest_name: name.trim(),
        phone: phone.trim(),
        // Empty until now, which left every Kalba row undated in Bookings.
        ...(type === "pickup" && pickupAt
          ? { date: slotDateValue(new Date(pickupAt)), time: slotTimeValue(new Date(pickupAt)) }
          : {}),
        // A food order has no party; the column is not nullable, so it reads 1.
        guests: 1,
        // Kept in English: this row is read by staff in the admin panel.
        notes: `${type === "pickup" ? "Pickup" : "Delivery"} order · ${itemsText || "(no items)"} · Total: AED ${total}${where}`,
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
                  {discountAmount + studentDiscount > 0 ? (
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
              {studentDiscount > 0 && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-orange-100">
                  <span className="text-[11px] text-green-600 font-semibold">
                    🎓 {t("kalba.cart.studentDiscount", { percent: studentPercent })}
                  </span>
                  <span className="text-[11px] text-green-600 font-bold">{t("kalba.cart.discount", { amount: studentDiscount })}</span>
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
              <CartRow
                key={item.id}
                item={item}
                qty={cartQty[item.id] ?? 0}
                selectedAddons={cartAddons[item.id] ?? []}
                onQtyChange={onQtyChange}
                onEditOptions={onEditOptions}
              />
            ))
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          {askingPickup ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-gray-900">{t("kalba.cart.pickupDetails")}</p>
                <button
                  onClick={() => setAskingPickup(false)}
                  className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {t("kalba.cart.changeToDelivery")}
                </button>
              </div>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder={t("kalba.cart.namePlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <input
                type="tel"
                inputMode="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("kalba.cart.phonePlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />

              <div>
                <select
                  value={pickupAt}
                  onChange={(e) => setPickupAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">{t("kalba.cart.pickupTime")}</option>
                  {slots.map((slot) => (
                    <option key={slot.toISOString()} value={slot.toISOString()}>
                      {slotLabel(slot)}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  {slots.length === 0
                    ? t("kalba.cart.noPickupToday")
                    : t("kalba.cart.pickupTimeHint", { minutes: pickupLeadMinutes })}
                </p>
              </div>

              <a
                href={pickupReady ? buildWaUrl("pickup") : undefined}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!pickupReady) { e.preventDefault(); return; }
                  saveKalbaOrder("pickup");
                  onClose();
                }}
                aria-disabled={!pickupReady}
                className={`flex items-center justify-center gap-1.5 py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-md transition-opacity ${
                  pickupReady ? "hover:opacity-90" : "opacity-50 cursor-not-allowed"
                }`}
                style={{ background: "#ea580c" }}
              >
                {pickupReady ? t("kalba.cart.sendPickup") : t("kalba.cart.detailsRequired")}
              </a>
            </div>
          ) : askingAddress ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-gray-900">{t("kalba.cart.deliveryAddress")}</p>
                <button
                  onClick={() => setAskingAddress(false)}
                  className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {t("kalba.cart.changeToPickup")}
                </button>
              </div>

              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                autoFocus
                placeholder={t("kalba.cart.addressPlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={useMyLocation}
                  disabled={locating}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  <MapPin size={12} className={mapPin ? "text-green-600" : "text-[#ea580c]"} />
                  {locating ? t("kalba.cart.locating") : t("kalba.cart.useLocation")}
                </button>
                {locationNote && (
                  <span className={`text-[11px] ${mapPin ? "text-green-600" : "text-gray-400"}`}>{locationNote}</span>
                )}
              </div>

              <a
                href={address.trim() ? buildWaUrl("delivery") : undefined}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!address.trim()) { e.preventDefault(); return; }
                  saveKalbaOrder("delivery");
                  onClose();
                }}
                aria-disabled={!address.trim()}
                className={`flex items-center justify-center gap-1.5 py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-md transition-opacity ${
                  address.trim() ? "hover:opacity-90" : "opacity-50 cursor-not-allowed"
                }`}
                style={{ background: "#ea580c" }}
              >
                {address.trim() ? t("kalba.cart.sendDelivery") : t("kalba.cart.addressRequired")}
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAskingPickup(true)}
                className="flex items-center justify-center gap-1.5 py-3.5 rounded-2xl font-extrabold text-sm border-2 hover:bg-orange-50 transition-colors"
                style={{ borderColor: "#ea580c", color: "#ea580c" }}
              >
                {t("kalba.cart.pickup")}
              </button>
              <button
                onClick={() => setAskingAddress(true)}
                className="flex items-center justify-center gap-1.5 py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-md hover:opacity-90 transition-opacity"
                style={{ background: "#ea580c" }}
              >
                {t("kalba.cart.delivery")}
              </button>
            </div>
          )}
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
  /* Extras are chosen per dish, not per cart line — see lib/kalba/addons. */
  const [cartAddons, setCartAddons] = useState<AddonSelection>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const { card: studentCard } = useStudentCard();

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
    /* Emptying the dish out of the cart forgets its answers too — coming back to
       a dish still carrying last time's cheese is a charge nobody asked for. */
    if (qty === 0) setCartAddons((prev) => ({ ...prev, [id]: [] }));
  }

  const allCartItems: CartItem[] = [
    ...popular.map((p) => ({
      id: p.id,
      name: pick(p, "name"),
      description: pick(p, "description"),
      image_url: p.image_url,
      priceLabel: `AED ${p.price}`,
      numericPrice: parseFloat(p.price) || 0,
      groups: p.addon_groups ?? [],
    })),
    ...specials.map((s) => ({
      id: s.id,
      name: pick(s, "name"),
      description: pick(s, "description"),
      image_url: s.image_url,
      priceLabel: pick(s, "price_text") || t("kalba.cart.seePrice"),
      numericPrice: parseNumericPrice(s.price_text),
      // Specials are managed on their own screen and ask nothing.
      groups: [] as KalbaAddonGroup[],
    })),
  ];

  /* Which dish the options sheet is showing, and whether it was opened to add
     it or to change an answer already in the cart. */
  const [sheet, setSheet] = useState<{ id: string; mode: "add" | "edit" } | null>(null);
  const sheetItem = sheet ? allCartItems.find((i) => i.id === sheet.id) ?? null : null;

  /**
   * Adding a dish. One that asks nothing goes straight in; one that does opens
   * its sheet, because a required question cannot be answered from a card.
   */
  function handleAdd(itemId: string) {
    const item = allCartItems.find((i) => i.id === itemId);
    if (!item || item.groups.length === 0) {
      handleQtyChange(itemId, (cartQty[itemId] ?? 0) + 1);
      return;
    }
    setSheet({ id: itemId, mode: "add" });
  }

  function handleSheetConfirm(selection: string[], qty: number) {
    if (!sheet) return;
    setCartAddons((prev) => ({ ...prev, [sheet.id]: selection }));
    setCartQty((prev) => ({
      ...prev,
      // Adding tops up what is already there; editing leaves the count alone.
      [sheet.id]: sheet.mode === "add" ? (prev[sheet.id] ?? 0) + qty : qty,
    }));
    setSheet(null);
  }

  const totalQty = allCartItems.reduce((n, i) => n + (cartQty[i.id] ?? 0), 0);
  const totalPrice = allCartItems.reduce((sum, i) => {
    return sum + unitPrice(i, cartAddons) * (cartQty[i.id] ?? 0);
  }, 0);

  // Discount calculation
  let discountAmount = 0;
  if (appliedCoupon && totalPrice > 0) {
    const { discount_type, discount_value, applicable_item_ids } = appliedCoupon;
    let base = totalPrice;
    if (applicable_item_ids.length > 0) {
      base = allCartItems.reduce((sum, i) => {
        if (!applicable_item_ids.includes(i.id)) return sum;
        return sum + unitPrice(i, cartAddons) * (cartQty[i.id] ?? 0);
      }, 0);
    }
    discountAmount = discount_type === "percentage"
      ? parseFloat((base * discount_value / 100).toFixed(2))
      : parseFloat(Math.min(discount_value, base).toFixed(2));
  }
  /* The card discounts the whole basket, on top of any coupon: the two are
     separate promises to the customer, not alternatives. */
  const studentDiscount = studentDiscountAmount(studentCard, totalPrice);
  const studentPercent = studentCard?.discount_percent ?? STUDENT_DISCOUNT_PERCENT;

  const finalPrice = Math.max(0, parseFloat((totalPrice - discountAmount - studentDiscount).toFixed(2)));

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
                      {/* Two lines at most — the grid is six cards wide on a
                          desktop, and a card that grows drags its row with it. */}
                      {pick(p, "description") && (
                        <p className="text-[10.5px] text-gray-500 leading-snug mb-1.5 line-clamp-2">
                          {pick(p, "description")}
                        </p>
                      )}
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
                      {/* Off the photo and into the card, directly above the
                          rating and time — it is the number people scan for. */}
                      <p className="text-[13px] font-extrabold mb-1" style={{ color: "#ea580c" }}>
                        {t("common.price", { amount: p.price })}
                      </p>
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
                      {/* Warns that a tap opens the chooser rather than adding
                          straight away — the sheet is not a surprise then. */}
                      {(p.addon_groups ?? []).length > 0 && (
                        <p className="text-[9.5px] font-semibold text-orange-500 mt-1">
                          {t("kalba.addons.available")}
                        </p>
                      )}
                      <div className="h-px bg-gray-100 my-1.5" />
                      {/* A dish with questions keeps one button, whatever is in
                          the cart: the stepper would add a second helping with
                          the first one's answers, silently. */}
                      {qty === 0 || (p.addon_groups ?? []).length > 0 ? (
                        <button
                          onClick={() => handleAdd(p.id)}
                          className="w-full flex items-center justify-center gap-1 py-1 sm:py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 active:bg-orange-200 transition-colors"
                        >
                          <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span className="text-[10px] sm:text-xs font-semibold">
                            {qty > 0
                              ? `${t("common.add")} · ${qty}`
                              : (p.addon_groups ?? []).length > 0
                                ? t("kalba.addons.customise")
                                : t("common.add")}
                          </span>
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
          </div>
        </section>

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
          cartAddons={cartAddons}
          totalQty={totalQty}
          totalPrice={totalPrice}
          onQtyChange={handleQtyChange}
          onEditOptions={(id) => setSheet({ id, mode: "edit" })}
          onClose={() => setCartOpen(false)}
          whatsapp={hero.whatsapp}
          pickupLeadMinutes={hero.pickup_lead_minutes ?? 30}
          closesAt={hero.closes_at}
          openingHours={hero.opening_hours ?? []}
          isOpen={hero.is_open}
          restaurantName={copy(hero.name, hero.name_ar)}
          appliedCoupon={appliedCoupon}
          onApplyCoupon={handleApplyCoupon}
          onRemoveCoupon={() => { setAppliedCoupon(null); setCouponError(""); }}
          couponError={couponError}
          couponLoading={couponLoading}
          discountAmount={discountAmount}
          studentDiscount={studentDiscount}
          studentPercent={studentPercent}
          finalPrice={finalPrice}
        />
      )}

      {/* The dish and its questions */}
      {sheet && sheetItem && (
        <ItemOptionsSheet
          key={sheet.id}
          item={sheetItem}
          groups={sheetItem.groups}
          initialSelection={
            sheet.mode === "edit"
              ? (cartAddons[sheet.id] ?? defaultSelection(sheetItem.groups))
              : undefined
          }
          initialQty={sheet.mode === "edit" ? (cartQty[sheet.id] ?? 1) : 1}
          mode={sheet.mode}
          onConfirm={handleSheetConfirm}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}
