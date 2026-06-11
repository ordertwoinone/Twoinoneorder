"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowLeft, Heart, Share2, Star, Clock, ShoppingCart, Search,
  ChevronRight, Check, MapPin, Globe, Flame, Smile, Car, Calendar,
  Sun, Moon, Users, Utensils, Leaf, ChefHat,
  MoreHorizontal, UtensilsCrossed, Award, Heart as HeartIcon,
  ShieldCheck, Wifi, Music, MapPin as MapPinIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuffetBanner {
  id: string;
  title: string;
  title_highlight: string;
  subtitle: string;
  price: string;
  price_label: string;
  cta_text: string;
  bg_color: string;
  accent_color: string;
  image_url: string;
}

interface WhyChooseFeature {
  id: string;
  icon_name: string;
  label: string;
  sub_label: string;
}

interface BuffetTiming {
  id: string;
  label: string;
  time_range: string;
  price: string;
  price_label: string;
  theme: "orange" | "violet" | "pink";
}

interface PopularDish {
  id: string;
  name: string;
  tag: string;
  image_url: string;
  is_veg: boolean;
}

interface BuffetHero {
  restaurant_name: string;
  cuisine: string;
  rating: string;
  rating_count: string;
  delivery_time: string;
  delivery_fee: string;
  is_open: boolean;
  closes_at: string;
  cover_image_url: string;
}

interface MenuItemDB {
  id: string;
  section_id: string;
  name: string;
  image_url: string;
  is_veg: boolean;
  is_special: boolean;
  timing_ids: string[];
  timing_qty: Record<string, number>;
  sort_order: number;
  is_active: boolean;
}

interface MenuSectionDB {
  id: string;
  category_id: string;
  title: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
  buffet_menu_items: MenuItemDB[];
}

interface Props {
  hero:         BuffetHero | null;
  banners:      BuffetBanner[];
  features:     WhyChooseFeature[];
  timings:      BuffetTiming[];
  dishes:       PopularDish[];
  menuSections: MenuSectionDB[];
}

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  UtensilsCrossed, Globe, Flame, Smile, Car, Calendar, Sun, Moon,
  Users, Utensils, Leaf, ChefHat, MoreHorizontal,
  Star, Clock, Award, Heart: HeartIcon, ShieldCheck, Wifi, Music,
  MapPin: MapPinIcon,
};

// ─── Timing Theme Map ─────────────────────────────────────────────────────────

const THEME_MAP = {
  orange: { bg: "bg-orange-50", border: "border-orange-100", iconBg: "bg-orange-100", iconCls: "text-orange-500", priceCls: "text-orange-500", Icon: Sun   },
  violet: { bg: "bg-violet-50", border: "border-violet-100", iconBg: "bg-violet-100", iconCls: "text-violet-600", priceCls: "text-violet-600", Icon: Moon  },
  pink:   { bg: "bg-pink-50",   border: "border-pink-100",   iconBg: "bg-pink-100",   iconCls: "text-pink-500",   priceCls: "text-pink-500",   Icon: Calendar },
};

// (menu sections are now fully dynamic — loaded from DB via props)

const PHOTO_URLS = [
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
  "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80",
  "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80",
  "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&q=80",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
  "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
  "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function VegBadge({ veg }: { veg: boolean }) {
  return (
    <span className={`w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shrink-0 ${veg ? "bg-green-500" : "bg-red-500"}`}>
      <Leaf className="w-2.5 h-2.5 text-white" />
    </span>
  );
}

function DomeLogo({ size = "md" }: { size?: "md" | "lg" }) {
  const cls = size === "lg" ? "w-16 h-16 lg:w-20 lg:h-20" : "w-14 h-14";
  return (
    <div className={`${cls} rounded-full bg-gray-900 flex flex-col items-center justify-center shrink-0 border-2 border-yellow-400 shadow-md`}>
      <svg viewBox="0 0 28 16" className="w-7 h-4 mb-0.5" fill="none">
        <path d="M14 2C8 2 2 6.5 2 13L26 13C26 6.5 20 2 14 2Z" fill="#f59e0b" />
        <rect x="2" y="13" width="24" height="2.5" rx="1.25" fill="#f59e0b" />
        <rect x="12.5" y="15.5" width="3" height="3" fill="#f59e0b" />
      </svg>
      <p className="text-white font-bold text-center leading-none" style={{ fontSize: "4.5px" }}>BUFFET BY</p>
      <p className="text-yellow-400 font-bold text-center leading-none" style={{ fontSize: "4.5px" }}>TWO IN ONE</p>
    </div>
  );
}

function DishCard({ name, img, veg, special, isIncluded, qty, onQtyChange }: {
  name: string; img: string; veg: boolean; special: boolean;
  isIncluded: boolean; qty: number; onQtyChange: (qty: number) => void;
}) {
  return (
    <div className="shrink-0 w-[110px] sm:w-full bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative h-[90px] sm:h-[140px] lg:h-[155px] bg-gray-100">
        <img src={img} alt={name} className="absolute inset-0 w-full h-full object-cover" />
        {special && (
          <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded leading-tight z-10">
            Chef&apos;s<br />Special
          </span>
        )}
        {isIncluded && (
          <span className="absolute bottom-1.5 left-1.5 bg-green-500 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10 flex items-center gap-0.5">
            ✓ Included
          </span>
        )}
        <span className="absolute top-1.5 right-1.5 z-10"><VegBadge veg={veg} /></span>
      </div>
      <div className="px-2 sm:px-3 pt-1.5 sm:pt-2 pb-2 sm:pb-3">
        <p className="text-[11px] sm:text-sm font-semibold text-gray-800 leading-tight line-clamp-2 min-h-[28px] sm:min-h-[40px]">{name}</p>
        <div className="h-px bg-gray-100 my-1.5" />
        {!isIncluded && qty === 0 ? (
          <button
            onClick={() => onQtyChange(1)}
            className="w-full flex items-center justify-center gap-1 py-1 sm:py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 active:bg-orange-200 transition-colors"
          >
            <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="text-[10px] sm:text-xs font-semibold">Add</span>
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <button
              onClick={() => onQtyChange(Math.max(isIncluded ? 1 : 0, qty - 1))}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold hover:bg-orange-200 transition-colors"
            >−</button>
            <span className="text-xs sm:text-sm font-bold text-gray-900">{qty > 0 ? qty : 1}</span>
            <button
              onClick={() => onQtyChange((qty > 0 ? qty : 1) + 1)}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full text-white flex items-center justify-center text-sm font-bold hover:opacity-90 transition-opacity"
              style={{ background: "#ea580c" }}
            >+</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Buffet Menu Tab ──────────────────────────────────────────────────────────

function BuffetMenuTab({
  timings, menuSections, selectedTimingId, onTimingSelect, cartQty, onQtyChange,
}: {
  timings: BuffetTiming[];
  menuSections: MenuSectionDB[];
  selectedTimingId: string | null;
  onTimingSelect: (id: string | null) => void;
  cartQty: Record<string, number>;
  onQtyChange: (itemId: string, qty: number) => void;
}) {
  const totalItems = menuSections.reduce((n, s) => n + s.buffet_menu_items.filter((i) => i.is_active).length, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900">Buffet Menu</h2>
        <p className="text-sm sm:text-base text-gray-400 mt-0.5">{totalItems}+ dishes from around the world</p>
      </div>

      {/* Selectable timing cards */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Select your session to see what&apos;s included</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
          {timings.map((t) => {
            const cfg = THEME_MAP[t.theme] ?? THEME_MAP.orange;
            const selected = selectedTimingId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onTimingSelect(selected ? null : t.id)}
                className={`text-left rounded-2xl p-3 sm:p-5 lg:p-6 border-2 transition-all ${
                  selected
                    ? "border-orange-500 shadow-md"
                    : `${cfg.border} ${cfg.bg} hover:border-orange-300`
                }`}
                style={selected ? { background: cfg.bg.replace("bg-", "") } : {}}
              >
                <div className={`rounded-2xl p-3 sm:p-5 lg:p-6 -m-3 sm:-m-5 lg:-m-6 ${cfg.bg}`}>
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <cfg.Icon className={`w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0 ${selected ? "text-orange-500" : cfg.iconCls}`} />
                      <span className={`text-[10px] sm:text-sm lg:text-base font-bold leading-tight ${selected ? "text-orange-700" : "text-gray-800"}`}>{t.label}</span>
                    </div>
                    {selected && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 shrink-0" />}
                  </div>
                  <p className="text-[9px] sm:text-xs lg:text-sm text-gray-500 mb-2 sm:mb-3">{t.time_range}</p>
                  <p className={`text-[11px] sm:text-base lg:text-lg font-extrabold ${selected ? "text-orange-600" : cfg.priceCls}`}>
                    {t.price}
                    <span className="text-[9px] sm:text-xs font-normal text-gray-400 ml-1">{t.price_label}</span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {!selectedTimingId && (
          <p className="text-[11px] text-gray-400 mt-2 text-center">Tap a session above — included dishes will be highlighted automatically</p>
        )}
      </div>

      <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-2xl p-3 sm:p-5">
        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs sm:text-sm lg:text-base font-semibold text-gray-800">Kids 0–5 eat free &nbsp;·&nbsp; Kids 6–10 50% off</p>
          <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 mt-0.5">Prices are inclusive of VAT</p>
        </div>
      </div>

      {menuSections.map((section) => {
        const activeItems = section.buffet_menu_items.filter((i) => i.is_active);
        if (activeItems.length === 0) return null;
        return (
          <div key={section.id}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-xl lg:text-2xl font-extrabold text-gray-900">{section.title}</h3>
              <span className="text-xs sm:text-sm text-gray-500 border border-gray-200 rounded-full px-3 sm:px-4 py-1 sm:py-1.5">
                {activeItems.length} Items
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:overflow-visible sm:pb-0 sm:gap-4" style={{ scrollbarWidth: "none" }}>
              {activeItems.map((item) => {
                const timingIds = item.timing_ids ?? [];
                const isIncluded = selectedTimingId !== null &&
                  (timingIds.length === 0 || timingIds.includes(selectedTimingId));
                return (
                  <DishCard
                    key={item.id}
                    name={item.name}
                    img={item.image_url}
                    veg={item.is_veg}
                    special={item.is_special}
                    isIncluded={isIncluded}
                    qty={cartQty[item.id] ?? 0}
                    onQtyChange={(q) => onQtyChange(item.id, q)}
                  />
                );
              })}
              <div className="shrink-0 flex items-center pr-1 sm:hidden">
                <button className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shadow-sm transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  banners, features, timings, dishes,
}: {
  banners:  BuffetBanner[];
  features: WhyChooseFeature[];
  timings:  BuffetTiming[];
  dishes:   PopularDish[];
}) {
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex((i) => (i + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [banners.length]);

  const banner = banners[slideIndex];

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* Promo banner — dynamic carousel */}
      {banner && (
        <div
          className="rounded-2xl overflow-hidden border border-orange-100 relative h-[178px] sm:h-[205px] lg:h-[228px]"
          style={{ background: banner.bg_color }}
        >
          <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-5 sm:px-8 lg:px-10" style={{ width: "57%" }}>
            <p className="font-bold text-gray-900 leading-tight text-[1rem] sm:text-[1.3rem] lg:text-[1.5rem]">{banner.title}</p>
            <p className="font-extrabold leading-tight text-[1rem] sm:text-[1.3rem] lg:text-[1.5rem] mt-0.5 mb-2" style={{ color: banner.accent_color }}>
              {banner.title_highlight}
            </p>
            <p className="text-[10px] sm:text-sm text-gray-500 mb-1.5 sm:mb-2">{banner.subtitle}</p>
            {banner.price && (
              <p className="font-bold text-xs sm:text-base lg:text-lg mb-2 sm:mb-3" style={{ color: banner.accent_color }}>
                {banner.price}{" "}
                <span className="font-normal text-gray-500 text-[10px] sm:text-sm">{banner.price_label}</span>
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/book-table"
                className="shrink-0 text-white font-bold rounded-full text-[10px] sm:text-sm px-3 sm:px-5 py-1.5 sm:py-2.5 hover:opacity-90 transition-opacity"
                style={{ background: banner.accent_color }}
              >
                {banner.cta_text} →
              </Link>
              <div className="flex items-start gap-1 sm:gap-1.5 bg-white/90 border border-orange-100 rounded-xl px-1.5 sm:px-2.5 py-1 sm:py-1.5">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400 mt-px shrink-0" />
                <div className="text-[8px] sm:text-[10px] leading-tight text-gray-600">
                  <p className="font-semibold">Kids 0–5 eat free</p>
                  <p>Kids 6–10 50% off</p>
                </div>
              </div>
            </div>
            {banners.length > 1 && (
              <div className="flex items-center gap-1.5 mt-2 sm:mt-3">
                {banners.map((_, i) => (
                  <button key={i} onClick={() => setSlideIndex(i)}
                    className="w-2 h-2 rounded-full transition-colors"
                    style={{ background: i === slideIndex ? banner.accent_color : "#d1d5db" }}
                  />
                ))}
              </div>
            )}
          </div>

          {banner.image_url && (
            <>
              <img src={banner.image_url} alt="Buffet spread"
                className="absolute top-0 right-0 h-full object-cover"
                style={{ width: "46%" }}
              />
              <div className="absolute top-0 right-0 h-full pointer-events-none"
                style={{ width: "46%", background: `linear-gradient(to right, ${banner.bg_color} 0%, ${banner.bg_color}72 22%, transparent 50%)` }}
              />
            </>
          )}
        </div>
      )}

      {/* Why Choose Us — dynamic */}
      {features.length > 0 && (
        <div>
          <h3 className="text-base sm:text-xl lg:text-2xl font-extrabold text-gray-900 mb-4 sm:mb-6">Why Choose Us</h3>
          <div className="grid gap-3 sm:gap-6 lg:gap-8" style={{ gridTemplateColumns: `repeat(${features.length}, 1fr)` }}>
            {features.map((f) => {
              const Icon = ICON_MAP[f.icon_name] ?? Star;
              return (
                <div key={f.id} className="flex flex-col items-center gap-2 sm:gap-3 text-center">
                  <div className="w-11 h-11 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-orange-50 flex items-center justify-center">
                    <Icon className="w-5 h-5 sm:w-7 sm:h-7 lg:w-9 lg:h-9 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[9px] sm:text-sm lg:text-base font-semibold text-gray-800 leading-tight">{f.label}</p>
                    <p className="hidden sm:block text-xs lg:text-sm text-gray-400 mt-0.5">{f.sub_label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Buffet Timings — dynamic */}
      {timings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "#ea580c" }}>
                <Clock className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-sm sm:text-base lg:text-lg font-extrabold text-gray-900">Buffet Timings</h3>
            </div>
            <button className="text-xs sm:text-sm font-semibold hover:opacity-80" style={{ color: "#ea580c" }}>View all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 sm:gap-4" style={{ scrollbarWidth: "none" }}>
            {timings.map((t) => {
              const cfg = THEME_MAP[t.theme] ?? THEME_MAP.orange;
              return (
                <div key={t.id} className={`${cfg.bg} border ${cfg.border} rounded-2xl px-4 py-3 sm:py-4 flex items-center gap-3 shrink-0 w-48 sm:w-auto`}>
                  <div className={`${cfg.iconBg} w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0`}>
                    <cfg.Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${cfg.iconCls}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm sm:text-base leading-tight">{t.label}</p>
                    <p className="text-gray-500 text-[11px] sm:text-xs mt-0.5 leading-tight">{t.time_range}</p>
                    <p className={`font-bold text-sm sm:text-base mt-1 leading-tight ${cfg.priceCls}`}>
                      {t.price} <span className="font-normal text-gray-400 text-[10px] sm:text-xs">{t.price_label}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Popular Dishes — dynamic */}
      <PopularDishesSection dishes={dishes} />

      <div className="rounded-2xl bg-green-50 border border-green-200 p-5 sm:p-8 lg:p-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-base sm:text-xl lg:text-2xl font-extrabold text-gray-900">Reserve your seat today!</p>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Walk-ins welcome · Bookings preferred</p>
        </div>
        <Link href="/book-table" className="shrink-0 border-2 border-green-500 text-green-700 font-bold px-5 sm:px-8 py-2.5 sm:py-3 lg:py-4 rounded-full text-sm sm:text-base hover:bg-green-100 transition-colors whitespace-nowrap">
          Book Table
        </Link>
      </div>
    </div>
  );
}

// ─── Popular Dishes Section ───────────────────────────────────────────────────

function PopularDishesSection({ dishes }: { dishes: PopularDish[] }) {
  if (dishes.length === 0) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-base sm:text-xl lg:text-2xl font-extrabold text-gray-900">Popular Dishes</h3>
        <button className="text-sm sm:text-base font-semibold flex items-center gap-1 hover:opacity-80" style={{ color: "#ea580c" }}>
          See all <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 md:grid-cols-5 sm:overflow-visible sm:pb-0 sm:gap-5" style={{ scrollbarWidth: "none" }}>
        {dishes.map((dish) => (
          <div key={dish.id} className="shrink-0 w-32 sm:w-auto">
            <div className="w-full h-32 sm:h-40 lg:h-48 rounded-2xl mb-2 relative overflow-hidden bg-gray-100">
              <img src={dish.image_url} alt={dish.name} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/10" />
              <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full leading-tight z-10">{dish.tag}</span>
              <span className="absolute bottom-2 right-2 z-10"><VegBadge veg={dish.is_veg} /></span>
            </div>
            <p className="text-xs sm:text-sm lg:text-base font-semibold text-gray-800 text-center leading-tight">{dish.name}</p>
            <div className="border-t border-gray-100 mt-1.5 pt-1.5">
              <p className="text-[11px] sm:text-xs text-green-600 font-semibold text-center">Included</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── About Tab ────────────────────────────────────────────────────────────────

function AboutTab() {
  return (
    <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
      <div className="rounded-2xl border border-gray-100 p-5 sm:p-6 lg:p-8">
        <h3 className="text-sm sm:text-base lg:text-lg font-extrabold text-gray-900 mb-3">About Buffet By Two In One</h3>
        <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
          Experience the finest all-you-can-eat buffet in Kuwait. We bring together over 100 dishes
          from around the world, freshly prepared every hour by our award-winning chefs.
        </p>
      </div>
      <div className="rounded-2xl border border-gray-100 p-5 sm:p-6 lg:p-8 space-y-3 sm:space-y-4">
        <h3 className="text-sm sm:text-base lg:text-lg font-extrabold text-gray-900">Location & Hours</h3>
        <div className="flex items-start gap-2.5">
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 shrink-0 mt-0.5" />
          <p className="text-sm sm:text-base text-gray-600">Block 7, Salmiya, Kuwait City, Kuwait</p>
        </div>
        <div className="flex items-start gap-2.5">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="text-sm sm:text-base text-gray-600 space-y-0.5">
            <p>Sat – Thu: 12:00 PM – 11:30 PM</p>
            <p>Fri: 11:00 AM – 11:30 PM</p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-100 p-5 sm:p-6 lg:p-8 sm:col-span-2">
        <h3 className="text-sm sm:text-base lg:text-lg font-extrabold text-gray-900 mb-3 sm:mb-4">Cuisine Types</h3>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {["Arabic", "International", "Asian", "Mediterranean", "Indian", "Continental"].map((c) => (
            <span key={c} className="bg-orange-50 text-orange-600 text-xs sm:text-sm lg:text-base font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-full">{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Photos Tab ───────────────────────────────────────────────────────────────

function PhotosTab() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
      {PHOTO_URLS.map((src, i) => (
        <div key={i} className="aspect-square rounded-xl sm:rounded-2xl overflow-hidden relative bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity">
          <img src={src} alt={`Photo ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}

// ─── Reviews Tab ─────────────────────────────────────────────────────────────

function ReviewsTab() {
  const reviews = [
    { name: "Ahmed Al-Rashidi", rating: 5, text: "Amazing variety! The grilled salmon was outstanding.", date: "2 days ago" },
    { name: "Sara M.",          rating: 5, text: "Best buffet in Kuwait! The dessert section alone is worth the price.", date: "5 days ago" },
    { name: "James T.",         rating: 4, text: "Great ambience and food quality. Slightly long wait during peak hours.", date: "1 week ago" },
    { name: "Fatima Al-K.",     rating: 5, text: "Kids loved it! The chocolate fountain is a must-try.", date: "2 weeks ago" },
  ];
  const bars = [72, 18, 6, 2, 2];
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center gap-8 sm:gap-12 p-5 sm:p-6 lg:p-8 rounded-2xl border border-gray-100">
        <div className="text-center shrink-0">
          <p className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900">4.6</p>
          <div className="flex gap-0.5 justify-center mt-2">
            {[1,2,3,4,5].map((i) => <Star key={i} className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${i<=4?"fill-yellow-400 text-yellow-400":"fill-gray-200 text-gray-200"}`} />)}
          </div>
          <p className="text-xs sm:text-sm lg:text-base text-gray-400 mt-1.5">2,100+ ratings</p>
        </div>
        <div className="flex-1 space-y-2 sm:space-y-3">
          {[5,4,3,2,1].map((n) => (
            <div key={n} className="flex items-center gap-3">
              <span className="text-xs sm:text-sm lg:text-base text-gray-400 w-3">{n}</span>
              <div className="flex-1 h-2 sm:h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${bars[5-n]}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
        {reviews.map((r) => (
          <div key={r.name} className="rounded-2xl border border-gray-100 p-4 sm:p-5 lg:p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="font-extrabold text-sm sm:text-base" style={{ color: "#ea580c" }}>{r.name[0]}</span>
                </div>
                <div>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">{r.name}</p>
                  <p className="text-xs sm:text-sm text-gray-400">{r.date}</p>
                </div>
              </div>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((i) => <Star key={i} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${i<=r.rating?"fill-yellow-400 text-yellow-400":"fill-gray-200 text-gray-200"}`} />)}
              </div>
            </div>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cart Modal ───────────────────────────────────────────────────────────────

function CartModal({
  selectedTiming, allActiveItems, selectedTimingId, cartQty, onQtyChange, onClose,
}: {
  selectedTiming: BuffetTiming | null;
  allActiveItems: MenuItemDB[];
  selectedTimingId: string | null;
  cartQty: Record<string, number>;
  onQtyChange: (itemId: string, qty: number) => void;
  onClose: () => void;
}) {
  const allAnnotated = allActiveItems.map((item) => {
    const timingIds = item.timing_ids ?? [];
    const included = selectedTimingId !== null && (timingIds.length === 0 || timingIds.includes(selectedTimingId));
    const qty = cartQty[item.id] ?? 0;
    return { ...item, included, qty };
  });

  // All included items are shown (auto part of the session)
  const includedItems = allAnnotated.filter((i) => i.included);
  // Extras: non-included items the user manually added
  const extrasInCart  = allAnnotated.filter((i) => !i.included && i.qty > 0);
  const totalQty = includedItems.length + extrasInCart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-extrabold text-gray-900">Your Cart</h2>
            {totalQty > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{totalQty}</span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Session pill */}
        <div className="px-5 pb-3 shrink-0">
          {selectedTiming ? (
            <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
              <div>
                <p className="text-[11px] text-gray-500">Selected Session</p>
                <p className="text-sm font-extrabold text-gray-900">{selectedTiming.label}</p>
                <p className="text-[11px] text-gray-400">{selectedTiming.time_range}</p>
              </div>
              <p className="text-lg font-extrabold text-orange-500">
                {selectedTiming.price}
                <span className="text-[11px] font-normal text-gray-400 ml-1">{selectedTiming.price_label}</span>
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center">
              <p className="text-sm text-gray-400">No session selected</p>
              <p className="text-[11px] text-gray-300 mt-0.5">Go to Buffet Menu tab to choose a timing</p>
            </div>
          )}
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-4 min-h-0">
          {includedItems.length === 0 && extrasInCart.length === 0 ? (
            <div className="py-8 text-center">
              <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No session selected</p>
              <p className="text-[11px] text-gray-300 mt-0.5">Select a buffet timing to see included dishes</p>
            </div>
          ) : (
            <>
              {includedItems.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">Included in Session</p>
                    <span className="text-[10px] text-gray-400">{includedItems.length} dishes</span>
                  </div>
                  <div className="space-y-2">
                    {includedItems.map((item) => (
                      <CartRow key={item.id} item={item} onQtyChange={onQtyChange} />
                    ))}
                  </div>
                </div>
              )}
              {extrasInCart.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wider mb-2">Extra Add-ons</p>
                  <div className="space-y-2">
                    {extrasInCart.map((item) => (
                      <CartRow key={item.id} item={item} onQtyChange={onQtyChange} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <Link
            href="/book-table"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-md hover:opacity-90 transition-opacity"
            style={{ background: "#ea580c" }}
          >
            Book Table
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

function CartRow({ item, onQtyChange }: {
  item: MenuItemDB & { included: boolean; qty: number };
  onQtyChange: (id: string, qty: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{item.name}</p>
        {item.included && (
          <p className="text-[10px] text-green-600 font-semibold">✓ Included</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onQtyChange(item.id, Math.max(0, item.qty - 1))}
          className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold hover:bg-orange-200 transition-colors"
        >−</button>
        <span className="text-sm font-bold text-gray-900 w-5 text-center">{item.qty}</span>
        <button
          onClick={() => onQtyChange(item.id, item.qty + 1)}
          className="w-6 h-6 rounded-full text-white flex items-center justify-center text-sm font-bold hover:opacity-90 transition-opacity"
          style={{ background: "#ea580c" }}
        >+</button>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

type Tab = "overview" | "menu" | "about" | "photos" | "reviews";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview"        },
  { id: "menu",     label: "Buffet Menu"     },
  { id: "about",    label: "About"           },
  { id: "reviews",  label: "Reviews (2.1K+)" },
  { id: "photos",   label: "Photos"          },
];

export default function BuffetContent({ hero, banners, features, timings, dishes, menuSections }: Props) {
  const h = hero ?? {
    restaurant_name: "Buffet By Two In One",
    cuisine: "Buffet · International",
    rating: "4.6",
    rating_count: "2.1K+",
    delivery_time: "20–30 min",
    delivery_fee: "KD 0.600 delivery",
    is_open: true,
    closes_at: "11:30 PM",
    cover_image_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=700&q=85",
  };
  const [activeTab, setActiveTab]           = useState<Tab>("overview");
  const [liked, setLiked]                   = useState(false);
  const [selectedTimingId, setSelectedTimingId] = useState<string | null>(null);
  const [cartQty, setCartQty]               = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen]             = useState(false);

  // Auto-initialise included items to qty=1 whenever timing changes
  useEffect(() => {
    if (!selectedTimingId) return;
    const items = menuSections.flatMap((s) => s.buffet_menu_items.filter((i) => i.is_active));
    setCartQty((prev) => {
      const updates: Record<string, number> = {};
      let changed = false;
      items.forEach((item) => {
        const ids = item.timing_ids ?? [];
        const isIncluded = ids.includes(selectedTimingId);
        if (isIncluded && !(prev[item.id] > 0)) {
          updates[item.id] = (item.timing_qty ?? {})[selectedTimingId] ?? 1;
          changed = true;
        }
      });
      return changed ? { ...prev, ...updates } : prev;
    });
  }, [selectedTimingId, menuSections]);

  function handleQtyChange(itemId: string, qty: number) {
    setCartQty((prev) => ({ ...prev, [itemId]: qty }));
  }

  const selectedTiming = timings.find((t) => t.id === selectedTimingId) ?? null;

  const allActiveItems = menuSections.flatMap((s) => s.buffet_menu_items.filter((i) => i.is_active));

  const includedCount = selectedTimingId
    ? allActiveItems.filter((i) => {
        const ids = i.timing_ids ?? [];
        return ids.includes(selectedTimingId);
      }).length
    : 0;

  const extraQty = allActiveItems
    .filter((i) => {
      if (!selectedTimingId) return true;
      const ids = i.timing_ids ?? [];
      return !(ids.includes(selectedTimingId));
    })
    .reduce((sum, i) => sum + (cartQty[i.id] ?? 0), 0);

  const totalCartItems = includedCount + extraQty;

  return (
    <>
      <div className="sm:hidden sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div className="flex gap-2">
            <button onClick={() => setLiked((v) => !v)} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center">
              <Heart className={`w-4 h-4 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
            </button>
            <button className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      <section className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="shrink-0"><DomeLogo size="lg" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-xl lg:text-2xl font-extrabold text-gray-900 leading-tight truncate">{h.restaurant_name}</h1>
                <span className="shrink-0 w-[18px] h-[18px] sm:w-5 sm:h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={3} />
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{h.cuisine}</p>
              <div className="flex items-center gap-1 sm:gap-1.5 mt-1 flex-wrap">
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-gray-800">{h.rating}</span>
                <span className="text-xs sm:text-sm text-gray-400">({h.rating_count})</span>
                <span className="text-gray-300 text-xs">·</span>
                <span className="text-xs sm:text-sm text-gray-500">{h.delivery_time}</span>
                <span className="text-gray-300 text-xs">·</span>
                <span className="text-xs sm:text-sm text-gray-500">{h.delivery_fee}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full ${h.is_open ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {h.is_open ? "Open" : "Closed"}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-400">· Closes {h.closes_at}</span>
              </div>
            </div>
            {h.cover_image_url && (
              <div className="shrink-0 relative rounded-xl overflow-hidden" style={{ width: "clamp(88px, 22vw, 280px)", height: "clamp(68px, 14vw, 148px)" }}>
                <img src={h.cover_image_url} alt="Buffet food" className="absolute inset-0 w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="mt-3 sm:mt-4 max-w-xs sm:max-w-sm">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
              <input type="text" placeholder="Search dishes, cuisines..." className="flex-1 bg-transparent text-xs sm:text-sm text-gray-600 placeholder-gray-400 outline-none" />
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-14 sm:static z-30 bg-white border-b border-gray-200 shadow-sm sm:shadow-none">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? "border-orange-500 text-orange-500" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 lg:py-10">
        {activeTab === "overview" && (
          <OverviewTab banners={banners} features={features} timings={timings} dishes={dishes} />
        )}
        {activeTab === "menu"     && (
          <BuffetMenuTab
            timings={timings}
            menuSections={menuSections}
            selectedTimingId={selectedTimingId}
            onTimingSelect={setSelectedTimingId}
            cartQty={cartQty}
            onQtyChange={handleQtyChange}
          />
        )}
        {activeTab === "about"    && <AboutTab />}
        {activeTab === "photos"   && <PhotosTab />}
        {activeTab === "reviews"  && <ReviewsTab />}
      </div>

      {/* Mobile cart bar */}
      <div className="fixed bottom-16 left-0 right-0 z-40 px-4 sm:hidden">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 flex items-center px-4 py-3 gap-3">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#ea580c" }}>
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            {totalCartItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{totalCartItems}</span>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-none">{totalCartItems} item{totalCartItems !== 1 ? "s" : ""}</p>
            <p className="text-sm font-extrabold text-gray-900 leading-tight">
              {selectedTiming ? `${selectedTiming.price} ${selectedTiming.price_label}` : "No session selected"}
            </p>
          </div>
          <button onClick={() => setCartOpen(true)} className="ml-auto text-white text-sm font-bold px-5 py-2.5 rounded-xl shrink-0 flex items-center gap-2" style={{ background: "#ea580c" }}>
            View Cart <span>→</span>
          </button>
        </div>
      </div>

      {/* Desktop floating cart */}
      <div className="hidden sm:flex fixed bottom-6 right-6 z-40">
        <button onClick={() => setCartOpen(true)} className="flex items-center gap-3 text-white font-bold px-5 py-3.5 rounded-2xl shadow-xl text-sm sm:text-base" style={{ background: "#ea580c" }}>
          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>
            {totalCartItems} item{totalCartItems !== 1 ? "s" : ""}
            {selectedTiming ? ` · ${selectedTiming.price} ${selectedTiming.price_label}` : ""}
          </span>
          <span className="bg-white font-bold text-xs sm:text-sm px-3 py-1 rounded-full" style={{ color: "#ea580c" }}>View Cart</span>
        </button>
      </div>

      {/* Cart modal */}
      {cartOpen && (
        <CartModal
          selectedTiming={selectedTiming}
          allActiveItems={allActiveItems}
          selectedTimingId={selectedTimingId}
          cartQty={cartQty}
          onQtyChange={handleQtyChange}
          onClose={() => setCartOpen(false)}
        />
      )}

    </>
  );
}
