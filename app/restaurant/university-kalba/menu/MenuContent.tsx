"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  Clock,
  ShoppingCart,
  ChevronLeft,
  Search,
  MapPin,
  GraduationCap,
} from "lucide-react";
import FavoriteButton from "@/components/ui/FavoriteButton";
import { useBottomBarSpace } from "@/hooks/useBottomBarSpace";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { pickupSlots, slotLabel, type DayHours } from "@/lib/pickup-slots";
import { useLocalizedField } from "@/lib/i18n/localized";
import type { TranslationKey } from "@/lib/i18n/types";
import type { KalbaPopularItem, KalbaCategory } from "../KalbaContent";

const DIETARY_TAGS: Record<string, TranslationKey> = {
  veg: "buffet.tags.veg",
  non_veg: "buffet.tags.non_veg",
  spicy: "buffet.tags.spicy",
  contains_cheese: "buffet.tags.contains_cheese",
};

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

function CartRow({
  item,
  qty,
  onQtyChange,
}: {
  item: CartItem;
  qty: number;
  onQtyChange: (id: string, qty: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 leading-tight truncate">
          {item.name}
        </p>
        <p className="text-[10px] font-bold" style={{ color: "#ea580c" }}>
          {item.priceLabel}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onQtyChange(item.id, Math.max(0, qty - 1))}
          className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold hover:bg-orange-200 transition-colors"
        >
          −
        </button>
        <span className="text-sm font-bold text-gray-900 w-5 text-center">
          {qty}
        </span>
        <button
          onClick={() => onQtyChange(item.id, qty + 1)}
          className="w-6 h-6 rounded-full text-white flex items-center justify-center text-sm font-bold hover:opacity-90 transition-opacity"
          style={{ background: "#ea580c" }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function CartModal({
  items,
  cartQty,
  totalQty,
  totalPrice,
  onQtyChange,
  onClose,
  whatsapp,
  restaurantName,
  pickupLeadMinutes,
  closesAt,
  openingHours,
  isOpen,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  couponError,
  couponLoading,
  discountAmount,
  finalPrice,
}: {
  items: CartItem[];
  cartQty: Record<string, number>;
  totalQty: number;
  totalPrice: number;
  onQtyChange: (id: string, qty: number) => void;
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
  finalPrice: number;
}) {
  const { t, tp } = useTranslation();
  /* Same as the branch page's cart: delivery asks where to before it sends. */
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

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationNote(t("kalba.cart.locationFailed"));
      return;
    }
    setLocating(true);
    setLocationNote(t("kalba.cart.locating"));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMapPin(`https://maps.google.com/?q=${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`);
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

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col mb-16 sm:mb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-extrabold text-gray-900">
              {t("kalba.cart.title")}
            </h2>
            {totalQty > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalQty}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Total pill */}
        <div className="px-5 pb-3 shrink-0">
          {totalQty > 0 ? (
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-gray-500">{t("kalba.cart.orderTotal")}</p>
                  <p className="text-sm font-extrabold text-gray-900">
                    {tp("common.items", totalQty)}
                  </p>
                </div>
                <div className="text-end">
                  {discountAmount > 0 ? (
                    <>
                      <p className="text-xs text-gray-400 line-through">
                        {t("common.price", { amount: totalPrice })}
                      </p>
                      <p className="text-lg font-extrabold text-orange-500">
                        {t("common.price", { amount: finalPrice })}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-extrabold text-orange-500">
                      {t("common.price", { amount: totalPrice })}
                    </p>
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
                  <span className="text-[11px] text-green-600 font-bold">
                    {t("kalba.cart.discount", { amount: discountAmount })}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center">
              <p className="text-sm text-gray-400">{t("kalba.cart.emptyTitle")}</p>
              <p className="text-[11px] text-gray-300 mt-0.5">
                {t("kalba.cart.emptyHintMenu")}
              </p>
            </div>
          )}
        </div>

        {/* Coupon */}
        <div className="px-5 pb-3 shrink-0">
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold text-sm">✓</span>
                <div>
                  <p className="text-xs font-bold text-green-700">
                    {appliedCoupon.code}
                  </p>
                  {appliedCoupon.description && (
                    <p className="text-[10px] text-green-600">
                      {appliedCoupon.description}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onRemoveCoupon}
                className="text-[11px] font-bold text-red-400 hover:text-red-600 transition-colors"
              >
                {t("common.remove")}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && couponInput.trim()) {
                    onApplyCoupon(couponInput.trim());
                  }
                }}
                placeholder={t("kalba.cart.couponPlaceholder")}
                dir="ltr"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold placeholder-gray-400 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all uppercase"
              />
              <button
                onClick={() => couponInput.trim() && onApplyCoupon(couponInput.trim())}
                disabled={couponLoading || !couponInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-opacity shrink-0"
                style={{ background: "#ea580c" }}
              >
                {couponLoading ? "…" : t("common.apply")}
              </button>
            </div>
          )}
          {couponError && (
            <p className="mt-1.5 text-[11px] text-red-500 font-medium">
              {couponError}
            </p>
          )}
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-2 min-h-0">
          {inCart.length === 0 ? (
            <div className="py-8 text-center">
              <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">{t("kalba.cart.noItems")}</p>
              <p className="text-[11px] text-gray-300 mt-0.5">
                {t("kalba.cart.noItemsHint")}
              </p>
            </div>
          ) : (
            inCart.map((item) => (
              <CartRow
                key={item.id}
                item={item}
                qty={cartQty[item.id] ?? 0}
                onQtyChange={onQtyChange}
              />
            ))
          )}
        </div>

        {/* Footer: Pickup + Delivery */}
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
            <div className="flex gap-3">
              <button
                onClick={() => setAskingPickup(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold text-sm border-2 transition-colors"
                style={{ borderColor: "#ea580c", color: "#ea580c" }}
              >
                {t("kalba.cart.pickup")}
              </button>
              <button
                onClick={() => setAskingAddress(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-md hover:opacity-90 transition-opacity"
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

export default function MenuContent({
  popular,
  categories,
  whatsapp,
  restaurantName,
  pickupLeadMinutes,
  closesAt,
  openingHours,
  isOpen,
}: {
  popular: KalbaPopularItem[];
  categories: KalbaCategory[];
  whatsapp: string;
  restaurantName: string;
  /** Minutes the kitchen needs; set in admin → University Kalba → Branch Info. */
  pickupLeadMinutes: number;
  /** When the branch shuts, as typed in Branch Info — no slot goes past it. */
  closesAt: string;
  openingHours: DayHours[];
  isOpen: boolean;
}) {
  const searchParams = useSearchParams();
  const { t, tp } = useTranslation();
  const pick = useLocalizedField();
  const [cartQty, setCartQty] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(
    searchParams.get("category") ?? "all"
  );
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // Keep the install prompt from landing on the cart bar.
  useBottomBarSpace();

  function handleQtyChange(id: string, qty: number) {
    setCartQty((prev) => ({ ...prev, [id]: qty }));
  }

  const cartItems: CartItem[] = popular.map((p) => ({
    id: p.id,
    name: pick(p, "name"),
    image_url: p.image_url,
    priceLabel: t("common.price", { amount: p.price }),
    numericPrice: parseFloat(p.price) || 0,
  }));

  const totalQty = cartItems.reduce((n, i) => n + (cartQty[i.id] ?? 0), 0);
  const totalPrice = cartItems.reduce(
    (sum, i) => sum + i.numericPrice * (cartQty[i.id] ?? 0),
    0
  );

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const inCartItems = cartItems.filter((i) => (cartQty[i.id] ?? 0) > 0);
    const applicableItems =
      appliedCoupon.applicable_item_ids.length === 0
        ? inCartItems
        : inCartItems.filter((i) =>
            appliedCoupon.applicable_item_ids.includes(i.id)
          );
    const base = applicableItems.reduce(
      (s, i) => s + i.numericPrice * (cartQty[i.id] ?? 0),
      0
    );
    if (appliedCoupon.discount_type === "percentage") {
      return Math.round((base * appliedCoupon.discount_value) / 100 * 100) / 100;
    }
    return Math.min(appliedCoupon.discount_value, base);
  }, [appliedCoupon, cartItems, cartQty]);

  const finalPrice = Math.max(0, totalPrice - discountAmount);

  const handleApplyCoupon = useCallback(
    async (code: string) => {
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
          setCouponError(data.error ?? t("kalba.cart.invalidCoupon"));
        }
      } catch {
        setCouponError(t("kalba.cart.couponFailed"));
      } finally {
        setCouponLoading(false);
      }
    },
    [totalPrice, t]
  );

  const filtered = useMemo(() => {
    return popular.filter((p) => {
      // Search matches either language, so an Arabic query finds Arabic names.
      const haystack = `${p.name} ${p.name_ar ?? ""}`.toLowerCase();
      const matchesSearch = search.trim() === "" || haystack.includes(search.toLowerCase());
      const matchesCategory =
        activeCategory === "all" || p.category_id === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [popular, search, activeCategory]);

  const orderUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent(
    t("kalba.wa.simple", { restaurant: restaurantName })
  )}`;

  const activeCategoryLabel =
    activeCategory === "all"
      ? null
      : categories.find((c) => c.id === activeCategory);

  return (
    <>
      {/* Page header */}
      <div className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/restaurant/university-kalba"
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-orange-50 hover:text-orange-600 transition-colors shrink-0"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400 leading-none">
              {restaurantName}
            </p>
            <h1 className="text-base font-extrabold text-gray-900 leading-tight">
              {t("menuPage.fullMenu")}
            </h1>
          </div>
          <a
            href={orderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-opacity shrink-0"
            style={{ background: "#ea580c" }}
          >
            {t("menuPage.orderViaWhatsapp")}
          </a>
        </div>
      </div>

      {/* No bottom padding on mobile — the page's pb-cart-bar covers it. */}
      <div className="max-w-7xl mx-auto px-4 sm:pb-12">
        {/* Hero strip */}
        <div
          className="mt-4 rounded-3xl px-5 py-5 sm:px-8 sm:py-6 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{
            background:
              "linear-gradient(110deg, #fdf3ea 0%, #fae3d1 55%, #f5d2b8 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍽️</span>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">
                {t("menuPage.heroTitle")}
              </h2>
              <p className="text-[12px] text-gray-500 mt-0.5">
                {t("menuPage.heroSubtitle", { items: tp("common.items", popular.length) })}
              </p>
            </div>
          </div>
          <div className="sm:ms-auto flex items-center gap-2">
            <GraduationCap size={16} className="text-orange-500 shrink-0" />
            <span className="text-[12px] font-semibold text-gray-600">
              {t("menuPage.studentPrices")}
            </span>
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-4 relative">
          <Search
            size={16}
            className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder={t("menuPage.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full ps-10 pe-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all"
          />
        </div>

        {/* Category filter pills */}
        {categories.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                activeCategory === "all"
                  ? "text-white border-transparent"
                  : "text-gray-600 border-gray-200 bg-white hover:border-orange-200"
              }`}
              style={
                activeCategory === "all" ? { background: "#ea580c" } : {}
              }
            >
              {t("menuPage.all")}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() =>
                  setActiveCategory(activeCategory === c.id ? "all" : c.id)
                }
                className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  activeCategory === c.id
                    ? "text-white border-transparent"
                    : "text-gray-600 border-gray-200 bg-white hover:border-orange-200"
                }`}
                style={
                  activeCategory === c.id ? { background: "#ea580c" } : {}
                }
              >
                <span>{c.emoji}</span>
                {pick(c, "label")}
              </button>
            ))}
          </div>
        )}

        {/* Results count */}
        <p className="mt-5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
          {tp("common.items", filtered.length)}
          {activeCategoryLabel && ` · ${activeCategoryLabel.emoji} ${pick(activeCategoryLabel, "label")}`}
          {search && t("menuPage.resultsFor", { query: search })}
        </p>

        {/* Menu grid */}
        {filtered.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-sm font-semibold text-gray-500">
              {t("menuPage.noItems")}
            </p>
            <div className="flex items-center justify-center gap-4 mt-3">
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-xs font-bold underline"
                  style={{ color: "#ea580c" }}
                >
                  {t("menuPage.clearSearch")}
                </button>
              )}
              {activeCategory !== "all" && (
                <button
                  onClick={() => setActiveCategory("all")}
                  className="text-xs font-bold underline"
                  style={{ color: "#ea580c" }}
                >
                  {t("menuPage.showAll")}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => {
              const qty = cartQty[p.id] ?? 0;
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 group transition-shadow hover:shadow-md tap-shrink"
                  style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
                >
                  <div className="relative h-40 sm:h-44">
                    {p.image_url ? (
                      <Image
                        src={p.image_url}
                        alt={pick(p, "name")}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-orange-50 flex items-center justify-center">
                        <span className="text-4xl">🍽️</span>
                      </div>
                    )}
                    <span
                      className="absolute top-2 start-2 text-[10px] font-bold px-2 py-0.5 rounded-md text-white z-10"
                      style={{ background: "#ea580c" }}
                    >
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
                    <h3 className="text-gray-900 font-extrabold text-[13px] leading-tight mb-1 min-h-[2.2em]">
                      {pick(p, "name")}
                    </h3>
                    {(p.tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mb-1.5">
                        {(p.tags ?? []).map((tag) => {
                          const dt = DIETARY_TAGS[tag];
                          return dt ? (
                            <span key={tag} className="text-[9px] px-1 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100 font-semibold leading-none">{t(dt)}</span>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10.5px] mb-2">
                      <span className="flex items-center gap-0.5 font-semibold text-gray-700">
                        <Star
                          size={10}
                          className="fill-amber-400 stroke-amber-400"
                        />
                        {p.rating}
                      </span>
                      <span className="flex items-center gap-0.5 text-gray-400">
                        <Clock size={9} />
                        {pick(p, "time_text")}
                      </span>
                    </div>
                    <div className="h-px bg-gray-100 mb-2" />
                    {qty === 0 ? (
                      <button
                        onClick={() => handleQtyChange(p.id, 1)}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 active:bg-orange-200 transition-colors tap-shrink"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">{t("common.addToCart")}</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() =>
                            handleQtyChange(p.id, Math.max(0, qty - 1))
                          }
                          className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold hover:bg-orange-200 transition-colors"
                        >
                          −
                        </button>
                        <span className="text-sm font-bold text-gray-900">
                          {qty}
                        </span>
                        <button
                          onClick={() => handleQtyChange(p.id, qty + 1)}
                          className="w-7 h-7 rounded-full text-white flex items-center justify-center text-sm font-bold hover:opacity-90 transition-opacity"
                          style={{ background: "#ea580c" }}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile cart bar — clears the bottom nav and the device safe area */}
      <div
        className="fixed left-0 right-0 z-40 px-4 sm:hidden"
        style={{ bottom: "calc(var(--bottom-stack) + 8px)" }}
      >
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 flex items-center px-4 py-3 gap-3">
          <div className="relative shrink-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "#ea580c" }}
            >
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            {totalQty > 0 && (
              <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {totalQty}
              </span>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-none">
              {tp("common.items", totalQty)}
            </p>
            <p className="text-sm font-extrabold text-gray-900 leading-tight">
              {totalQty > 0 ? t("common.price", { amount: totalPrice }) : t("kalba.cart.barEmpty")}
            </p>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="ms-auto text-white text-sm font-bold px-5 py-2.5 rounded-xl shrink-0 flex items-center gap-2 tap-shrink"
            style={{ background: "#ea580c" }}
          >
            {t("kalba.cart.viewCart")} <span className="rtl-flip inline-block">→</span>
          </button>
        </div>
      </div>

      {/* Desktop floating cart */}
      <div className="hidden sm:flex fixed bottom-6 end-6 z-40">
        <button
          onClick={() => setCartOpen(true)}
          className="flex items-center gap-3 text-white font-bold px-5 py-3.5 rounded-2xl shadow-xl text-sm sm:text-base"
          style={{ background: "#ea580c" }}
        >
          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>
            {tp("common.items", totalQty)}
            {totalQty > 0 ? ` · ${t("common.price", { amount: totalPrice })}` : ""}
          </span>
          <span
            className="bg-white font-bold text-xs sm:text-sm px-3 py-1 rounded-full"
            style={{ color: "#ea580c" }}
          >
            {t("kalba.cart.viewCart")}
          </span>
        </button>
      </div>

      {/* Cart modal */}
      {cartOpen && (
        <CartModal
          items={cartItems}
          cartQty={cartQty}
          totalQty={totalQty}
          totalPrice={totalPrice}
          onQtyChange={handleQtyChange}
          onClose={() => setCartOpen(false)}
          whatsapp={whatsapp}
          pickupLeadMinutes={pickupLeadMinutes}
          closesAt={closesAt}
          openingHours={openingHours}
          isOpen={isOpen}
          restaurantName={restaurantName}
          appliedCoupon={appliedCoupon}
          onApplyCoupon={handleApplyCoupon}
          onRemoveCoupon={() => {
            setAppliedCoupon(null);
            setCouponError("");
          }}
          couponError={couponError}
          couponLoading={couponLoading}
          discountAmount={discountAmount}
          finalPrice={finalPrice}
        />
      )}
    </>
  );
}
