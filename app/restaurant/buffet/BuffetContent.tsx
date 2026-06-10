"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, Heart, Share2, Star, Clock, ShoppingCart, Search,
  ChevronRight, Check, MapPin, Globe, Flame, Smile, Car, Calendar,
  Sun, Moon, Users, LayoutGrid, Utensils, Leaf, ChefHat,
  MoreHorizontal, UtensilsCrossed,
} from "lucide-react";

// ─── Static Data ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "all",      label: "All Dishes",    Icon: LayoutGrid      },
  { id: "starters", label: "Starters",      Icon: Utensils        },
  { id: "salads",   label: "Salads",        Icon: Leaf            },
  { id: "main",     label: "Main Course",   Icon: ChefHat         },
  { id: "live",     label: "Live Counters", Icon: Flame           },
  { id: "desserts", label: "Desserts",      Icon: UtensilsCrossed },
  { id: "more",     label: "More",          Icon: MoreHorizontal  },
];

const MENU_TIMINGS = [
  { label: "Lunch Buffet",   time: "12:00 PM – 4:00 PM", price: "KD 6.900", Icon: Sun,      bg: "bg-orange-50", border: "border-orange-100", iconBg: "bg-orange-100", iconCls: "text-orange-500", priceCls: "text-orange-500" },
  { label: "Dinner Buffet",  time: "6:00 PM – 11:00 PM", price: "KD 7.900", Icon: Moon,     bg: "bg-violet-50", border: "border-violet-100", iconBg: "bg-violet-100", iconCls: "text-violet-600", priceCls: "text-violet-600" },
  { label: "Weekend Brunch", time: "11:00 AM – 4:00 PM", price: "KD 7.900", Icon: Calendar, bg: "bg-pink-50",   border: "border-pink-100",   iconBg: "bg-pink-100",   iconCls: "text-pink-500",   priceCls: "text-pink-500"   },
];

const BUFFET_MENU_SECTIONS = [
  {
    id: "starters", title: "Starters", count: "12",
    items: [
      { name: "Creamy Mushroom Soup", img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80", veg: true,  special: false },
      { name: "Hummus with Pita",     img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80", veg: true,  special: false },
      { name: "Chicken Spring Rolls", img: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80", veg: false, special: false },
      { name: "Bruschetta Tomato",    img: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80", veg: true,  special: false },
      { name: "Prawn Cocktail",       img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80", veg: false, special: false },
      { name: "Caprese Salad",        img: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80", veg: true,  special: false },
    ],
  },
  {
    id: "salads", title: "Salads", count: "10",
    items: [
      { name: "Greek Salad",     img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",  veg: true, special: false },
      { name: "Caesar Salad",    img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80", veg: true, special: false },
      { name: "Kachumber Salad", img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80", veg: true, special: false },
      { name: "Coleslaw Salad",  img: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80", veg: true, special: false },
      { name: "Fattoush Salad",  img: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80", veg: true, special: false },
    ],
  },
  {
    id: "main", title: "Main Course", count: "30+",
    items: [
      { name: "Grilled Chicken", img: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80", veg: false, special: true  },
      { name: "Beef Biryani",    img: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&q=80", veg: false, special: false },
      { name: "Pasta Arrabiata", img: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80", veg: true,  special: false },
      { name: "Grilled Salmon",  img: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80", veg: false, special: false },
      { name: "Butter Chicken",  img: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80", veg: false, special: false },
      { name: "Lamb Ouzi",       img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80", veg: false, special: true  },
    ],
  },
  {
    id: "desserts", title: "Desserts", count: "15",
    items: [
      { name: "Choc Fountain", img: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80", veg: true, special: false },
      { name: "Baklava",       img: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80", veg: true, special: false },
      { name: "Umm Ali",       img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80", veg: true, special: false },
      { name: "Crème Brûlée",  img: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80", veg: true, special: false },
      { name: "Fresh Fruit",   img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",  veg: true, special: false },
    ],
  },
];

const POPULAR_DISHES = [
  { name: "Grilled Salmon", tag: "Chef's Special", img: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80", veg: false },
  { name: "Butter Chicken", tag: "Bestseller",     img: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80", veg: false },
  { name: "Caesar Salad",   tag: "Healthy Pick",   img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",   veg: true  },
  { name: "Beef Biryani",   tag: "Chef's Special", img: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80", veg: false },
  { name: "Choc Fountain",  tag: "Sweet Treat",    img: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80",   veg: true  },
];

const OVERVIEW_FEATURES = [
  { Icon: UtensilsCrossed, label: "100+ Dishes",     sub: "Per Session"   },
  { Icon: Globe,           label: "Multi Cuisine",    sub: "World Flavors" },
  { Icon: Flame,           label: "Freshly Prepared", sub: "Every Hour"    },
  { Icon: Smile,           label: "Great Ambience",   sub: "& Comfort"     },
  { Icon: Car,             label: "Free Parking",      sub: "Available"     },
];


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
  const cls = size === "lg"
    ? "w-16 h-16 lg:w-20 lg:h-20"
    : "w-14 h-14";
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

// ─── Dish Card ────────────────────────────────────────────────────────────────
// Mobile: fixed-width inside horizontal scroll.
// sm+: w-full to fill its grid column.

function DishCard({ name, img, veg, special }: { name: string; img: string; veg: boolean; special: boolean }) {
  return (
    <div className="shrink-0 w-[110px] sm:w-full bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative h-[90px] sm:h-[140px] lg:h-[155px] bg-gray-100">
        <img src={img} alt={name} className="absolute inset-0 w-full h-full object-cover" />
        {special && (
          <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded leading-tight z-10">
            Chef&apos;s<br />Special
          </span>
        )}
        <span className="absolute top-1.5 right-1.5 z-10">
          <VegBadge veg={veg} />
        </span>
      </div>
      <div className="px-2 sm:px-3 pt-1.5 sm:pt-2 pb-2 sm:pb-3">
        <p className="text-[11px] sm:text-sm font-semibold text-gray-800 leading-tight line-clamp-2 min-h-[28px] sm:min-h-[40px]">{name}</p>
        <div className="h-px bg-gray-100 my-1.5" />
        <p className="text-[11px] sm:text-xs text-green-600 font-medium">Included</p>
      </div>
    </div>
  );
}

// ─── Buffet Menu Tab ──────────────────────────────────────────────────────────

function BuffetMenuTab() {
  const [activeCategory, setActiveCategory] = useState("all");

  const visibleSections = activeCategory === "all"
    ? BUFFET_MENU_SECTIONS
    : BUFFET_MENU_SECTIONS.filter((s) => s.id === activeCategory);

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* Heading */}
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900">Buffet Menu</h2>
        <p className="text-sm sm:text-base text-gray-400 mt-0.5">100+ dishes from around the world</p>
      </div>

      {/* Category pills — horizontal scroll on mobile, wrap on desktop */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0 sm:gap-3"
        style={{ scrollbarWidth: "none" }}
      >
        {CATEGORIES.map(({ id, label, Icon }) => {
          const active = activeCategory === id;
          return (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className={`shrink-0 sm:shrink-0 flex flex-col items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border transition-colors min-w-[68px] sm:min-w-[80px] ${
                active
                  ? "text-white border-transparent"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
              style={active ? { background: "#A07820" } : {}}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs font-semibold leading-tight text-center">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Timing cards — 3 cols, light colored */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
        {MENU_TIMINGS.map((t) => (
          <div key={t.label} className={`${t.bg} ${t.border} border rounded-2xl p-3 sm:p-5 lg:p-6`}>
            <div className="flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-2">
              <t.Icon className={`w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0 ${t.iconCls}`} />
              <span className="text-[10px] sm:text-sm lg:text-base font-bold text-gray-800 leading-tight">{t.label}</span>
            </div>
            <p className="text-[9px] sm:text-xs lg:text-sm text-gray-500 mb-2 sm:mb-3">{t.time}</p>
            <p className={`text-[11px] sm:text-base lg:text-lg font-extrabold ${t.priceCls}`}>
              {t.price}
              <span className="text-[9px] sm:text-xs font-normal text-gray-400 ml-1">/ person</span>
            </p>
          </div>
        ))}
      </div>

      {/* Kids info */}
      <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-2xl p-3 sm:p-5">
        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs sm:text-sm lg:text-base font-semibold text-gray-800">Kids 0–5 eat free &nbsp;·&nbsp; Kids 6–10 50% off</p>
          <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 mt-0.5">Prices are inclusive of VAT</p>
        </div>
      </div>

      {/* Menu sections */}
      {visibleSections.map((section) => (
        <div key={section.id}>
          {/* Section header */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-xl lg:text-2xl font-extrabold text-gray-900">{section.title}</h3>
            <button className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 border border-gray-200 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 hover:border-gray-300 hover:bg-gray-50 transition-colors">
              {section.count} Items <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Mobile: horizontal scroll. Desktop: grid */}
          <div
            className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:overflow-visible sm:pb-0 sm:gap-4"
            style={{ scrollbarWidth: "none" }}
          >
            {section.items.map((item) => (
              <DishCard key={item.name} {...item} />
            ))}
            {/* View-more button — mobile horizontal scroll only */}
            <div className="shrink-0 flex items-center pr-1 sm:hidden">
              <button className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shadow-sm transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      ))}

    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ onBook }: { onBook: () => void }) {
  return (
    <div className="space-y-8 lg:space-y-10">
      {/* Promo banner — explicit height so image h-full resolves correctly */}
      <div
        className="rounded-2xl overflow-hidden border border-orange-100 relative h-[178px] sm:h-[205px] lg:h-[228px]"
        style={{ background: "#FFF5EE" }}
      >
        {/* LEFT: text — absolute so it fills left portion at full banner height */}
        <div
          className="absolute inset-y-0 left-0 flex flex-col justify-center px-5 sm:px-8 lg:px-10"
          style={{ width: "57%" }}
        >
          <p className="font-bold text-gray-900 leading-tight text-[1rem] sm:text-[1.3rem] lg:text-[1.5rem]">
            All you can eat,
          </p>
          <p
            className="font-extrabold leading-tight text-[1rem] sm:text-[1.3rem] lg:text-[1.5rem] mt-0.5 mb-2"
            style={{ color: "#ea580c" }}
          >
            Endless choices!
          </p>
          <p className="text-[10px] sm:text-sm text-gray-500 mb-1.5 sm:mb-2">
            Enjoy 100+ dishes from multiple cuisines.
          </p>
          <p className="font-bold text-xs sm:text-base lg:text-lg mb-2 sm:mb-3" style={{ color: "#ea580c" }}>
            KD 6.900{" "}
            <span className="font-normal text-gray-500 text-[10px] sm:text-sm">/ person</span>
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onBook}
              className="shrink-0 text-white font-bold rounded-full text-[10px] sm:text-sm px-3 sm:px-5 py-1.5 sm:py-2.5 hover:opacity-90 transition-opacity"
              style={{ background: "#ea580c" }}
            >
              Book a Table →
            </button>
            <div className="flex items-start gap-1 sm:gap-1.5 bg-white/90 border border-orange-100 rounded-xl px-1.5 sm:px-2.5 py-1 sm:py-1.5">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400 mt-px shrink-0" />
              <div className="text-[8px] sm:text-[10px] leading-tight text-gray-600">
                <p className="font-semibold">Kids 0–5 eat free</p>
                <p>Kids 6–10 50% off</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 sm:mt-3">
            <span className="w-2 h-2 rounded-full" style={{ background: "#ea580c" }} />
            <span className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="w-2 h-2 rounded-full bg-gray-300" />
          </div>
        </div>

        {/* RIGHT: <img> with h-full — works because parent has explicit height */}
        <img
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&q=85"
          alt="Buffet spread"
          className="absolute top-0 right-0 h-full object-cover"
          style={{ width: "46%" }}
        />

        {/* Gradient blends left edge of photo into background */}
        <div
          className="absolute top-0 right-0 h-full pointer-events-none"
          style={{
            width: "46%",
            background: "linear-gradient(to right, #FFF5EE 0%, rgba(255,245,238,0.45) 22%, transparent 50%)",
          }}
        />
      </div>

      {/* Features */}
      <div>
        <h3 className="text-base sm:text-xl lg:text-2xl font-extrabold text-gray-900 mb-4 sm:mb-6">Why Choose Us</h3>
        <div className="grid grid-cols-5 gap-3 sm:gap-6 lg:gap-8">
          {OVERVIEW_FEATURES.map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-2 sm:gap-3 text-center">
              <div className="w-11 h-11 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-orange-50 flex items-center justify-center">
                <f.Icon className="w-5 h-5 sm:w-7 sm:h-7 lg:w-9 lg:h-9 text-orange-500" />
              </div>
              <div>
                <p className="text-[9px] sm:text-sm lg:text-base font-semibold text-gray-800 leading-tight">{f.label}</p>
                <p className="hidden sm:block text-xs lg:text-sm text-gray-400 mt-0.5">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timings */}
      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "#ea580c" }}>
              <Clock className="w-3.5 h-3.5 text-white" />
            </span>
            <h3 className="text-sm sm:text-base lg:text-lg font-extrabold text-gray-900">Buffet Timings</h3>
          </div>
          <button className="text-xs sm:text-sm font-semibold hover:opacity-80" style={{ color: "#ea580c" }}>
            View all
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 sm:gap-4" style={{ scrollbarWidth: "none" }}>
          {MENU_TIMINGS.map((t) => (
            <div key={t.label} className={`${t.bg} border ${t.border} rounded-2xl px-4 py-3 sm:py-4 flex items-center gap-3 shrink-0 w-48 sm:w-auto`}>
              <div className={`${t.iconBg} w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0`}>
                <t.Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${t.iconCls}`} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm sm:text-base leading-tight">{t.label}</p>
                <p className="text-gray-500 text-[11px] sm:text-xs mt-0.5 leading-tight">{t.time}</p>
                <p className={`font-bold text-sm sm:text-base mt-1 leading-tight ${t.priceCls}`}>
                  {t.price} <span className="font-normal text-gray-400 text-[10px] sm:text-xs">/ person</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Dishes */}
      <div>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-base sm:text-xl lg:text-2xl font-extrabold text-gray-900">Popular Dishes</h3>
          <button className="text-sm sm:text-base font-semibold flex items-center gap-1 hover:opacity-80" style={{ color: "#ea580c" }}>
            See all <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {/* Mobile: horizontal scroll. Desktop: 5-col grid */}
        <div className="flex gap-4 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 md:grid-cols-5 sm:overflow-visible sm:pb-0 sm:gap-5" style={{ scrollbarWidth: "none" }}>
          {POPULAR_DISHES.map((dish) => (
            <div key={dish.name} className="shrink-0 w-32 sm:w-auto">
              <div className="w-full h-32 sm:h-40 lg:h-48 rounded-2xl mb-2 relative overflow-hidden bg-gray-100">
                <img src={dish.img} alt={dish.name} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/10" />
                <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full leading-tight z-10">{dish.tag}</span>
                <span className="absolute bottom-2 right-2 z-10"><VegBadge veg={dish.veg} /></span>
              </div>
              <p className="text-xs sm:text-sm lg:text-base font-semibold text-gray-800 text-center leading-tight">{dish.name}</p>
              <div className="border-t border-gray-100 mt-1.5 pt-1.5">
                <p className="text-[11px] sm:text-xs text-green-600 font-semibold text-center">Included</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Book table */}
      <div className="rounded-2xl bg-green-50 border border-green-200 p-5 sm:p-8 lg:p-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-base sm:text-xl lg:text-2xl font-extrabold text-gray-900">Reserve your seat today!</p>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Walk-ins welcome · Bookings preferred</p>
        </div>
        <button onClick={onBook} className="shrink-0 border-2 border-green-500 text-green-700 font-bold px-5 sm:px-8 py-2.5 sm:py-3 lg:py-4 rounded-full text-sm sm:text-base hover:bg-green-100 transition-colors whitespace-nowrap">
          Book Table
        </button>
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

// ─── Booking Modal ────────────────────────────────────────────────────────────

function BookingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-gray-900 mb-1">Book a Table</h2>
        <p className="text-sm sm:text-base text-gray-400 mb-5">Select your preferred buffet session.</p>
        <div className="space-y-3 sm:space-y-4 mb-6">
          {MENU_TIMINGS.map((t) => (
            <div key={t.label} className={`${t.bg} ${t.border} border rounded-2xl p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:opacity-90`}>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <t.Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${t.iconCls}`} />
                  <p className="font-extrabold text-sm sm:text-base text-gray-800">{t.label}</p>
                </div>
                <p className="text-xs sm:text-sm text-gray-500">{t.time}</p>
              </div>
              <span className={`font-extrabold text-base sm:text-lg ${t.priceCls}`}>{t.price}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-sm sm:text-base transition-colors">Close</button>
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

export default function BuffetContent() {
  const [activeTab, setActiveTab]     = useState<Tab>("overview");
  const [liked, setLiked]             = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  return (
    <>
      {/* ── Mobile-only simple header ── */}
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

      {/* ── Restaurant info ── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5">

          {/* Single flex row: logo | text (flex-1) | photo */}
          <div className="flex items-center gap-3 sm:gap-4">

            {/* Logo */}
            <div className="shrink-0">
              <DomeLogo size="lg" />
            </div>

            {/* Centre: name + meta */}
            <div className="flex-1 min-w-0">
              {/* Name + badge */}
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-xl lg:text-2xl font-extrabold text-gray-900 leading-tight truncate">
                  Buffet By Two In One
                </h1>
                <span className="shrink-0 w-[18px] h-[18px] sm:w-5 sm:h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={3} />
                </span>
              </div>

              {/* Cuisine */}
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Buffet · International</p>

              {/* Rating + delivery — all on one line */}
              <div className="flex items-center gap-1 sm:gap-1.5 mt-1 flex-wrap">
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-gray-800">4.6</span>
                <span className="text-xs sm:text-sm text-gray-400">(2.1K+)</span>
                <span className="text-gray-300 text-xs">·</span>
                <span className="text-xs sm:text-sm text-gray-500">20–30 min</span>
                <span className="text-gray-300 text-xs">·</span>
                <span className="text-xs sm:text-sm text-gray-500">KD 0.600 delivery</span>
              </div>

              {/* Open badge */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="bg-green-100 text-green-700 text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full">
                  Open
                </span>
                <span className="text-[10px] sm:text-xs text-gray-400">· Closes 11:30 PM</span>
              </div>
            </div>

            {/* Right: food photo */}
            <div
              className="shrink-0 relative rounded-xl overflow-hidden"
              style={{
                width: "clamp(88px, 22vw, 280px)",
                height: "clamp(68px, 14vw, 148px)",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=700&q=85"
                alt="Buffet food"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>

          </div>

          {/* Search */}
          <div className="mt-3 sm:mt-4 max-w-xs sm:max-w-sm">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search dishes, cuisines..."
                className="flex-1 bg-transparent text-xs sm:text-sm text-gray-600 placeholder-gray-400 outline-none"
              />
            </div>
          </div>

        </div>
      </section>

      {/* ── Tabs — sticky only on mobile, scrolls with page on desktop/tablet ── */}
      <div className="sticky top-14 sm:static z-30 bg-white border-b border-gray-200 shadow-sm sm:shadow-none">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-orange-500 text-orange-500"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 lg:py-10">
        {activeTab === "overview" && <OverviewTab onBook={() => setShowBooking(true)} />}
        {activeTab === "menu"     && <BuffetMenuTab />}
        {activeTab === "about"    && <AboutTab />}
        {activeTab === "photos"   && <PhotosTab />}
        {activeTab === "reviews"  && <ReviewsTab />}
      </div>

      {/* ── Floating cart — above BottomNav on mobile ── */}
      <div className="fixed bottom-16 left-0 right-0 z-40 px-4 sm:hidden">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 flex items-center px-4 py-3 gap-3">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#ea580c" }}>
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">2</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-none">2 items</p>
            <p className="text-sm font-extrabold text-gray-900 leading-tight">KD 13.800</p>
          </div>
          <button className="ml-auto text-white text-sm font-bold px-5 py-2.5 rounded-xl shrink-0 flex items-center gap-2" style={{ background: "#ea580c" }}>
            View Cart <span>→</span>
          </button>
        </div>
      </div>

      {/* Desktop cart — fixed bottom-right */}
      <div className="hidden sm:flex fixed bottom-6 right-6 z-40">
        <button className="flex items-center gap-3 text-white font-bold px-5 py-3.5 rounded-2xl shadow-xl text-sm sm:text-base" style={{ background: "#ea580c" }}>
          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>2 items · KD 13.800</span>
          <span className="bg-white font-bold text-xs sm:text-sm px-3 py-1 rounded-full" style={{ color: "#ea580c" }}>View Cart</span>
        </button>
      </div>

      {showBooking && <BookingModal onClose={() => setShowBooking(false)} />}
    </>
  );
}
