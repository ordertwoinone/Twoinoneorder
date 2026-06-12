import type { Metadata } from "next";
import Image from "next/image";
import {
  MapPin,
  Star,
  Clock,
  Check,
  ChevronRight,
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
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const revalidate = 60;

// ── Types ──────────────────────────────────────────────────────────────────

interface Hero {
  name: string;
  location: string;
  maps_url: string;
  whatsapp: string;
  rating: string;
  rating_count: string;
  delivery_time: string;
  delivery_fee: string;
  is_open: boolean;
  closes_at: string;
  student_title: string;
  student_subtitle: string;
  student_button: string;
}

interface Banner {
  title: string;
  title_highlight: string;
  subtitle: string;
  image_url: string;
  chips: { emoji: string; line1: string; line2: string }[];
}

interface Category {
  id: string;
  emoji: string;
  label: string;
}

interface PopularItem {
  id: string;
  name: string;
  price: string;
  rating: string;
  time_text: string;
  image_url: string;
}

interface Study {
  title: string;
  subtitle: string;
  image_url: string;
  button_text: string;
  features: { icon: string; label: string }[];
}

interface DailyDeal {
  id: string;
  day: string;
  title: string;
  description: string;
  emoji: string;
  bg_color: string;
  day_color: string;
}

interface Special {
  id: string;
  name: string;
  description: string;
  price_text: string;
  image_url: string;
}

// ── Fallbacks (used if the database is unreachable) ────────────────────────

const img = (id: string, w = 600) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

const DEFAULT_HERO: Hero = {
  name: "Two in One University Kalba",
  location: "Near University of Kalba, Kalba",
  maps_url: "https://www.google.com/maps/search/?api=1&query=University+City+Kalba+Sharjah",
  whatsapp: "971522305216",
  rating: "4.6",
  rating_count: "500+",
  delivery_time: "15–25 min",
  delivery_fee: "Free delivery",
  is_open: true,
  closes_at: "12:00 AM",
  student_title: "Are you a student?",
  student_subtitle: "Unlock exclusive student deals & discounts",
  student_button: "Verify Student",
};

const DEFAULT_BANNER: Banner = {
  title: "Made for Students,",
  title_highlight: "Loved by Everyone!",
  subtitle: "Great food. Better prices. Right on campus.",
  image_url: img("photo-1504754524776-8f4f37790ca0", 1200),
  chips: [
    { emoji: "🎓", line1: "Student Friendly", line2: "Pricing" },
    { emoji: "☕", line1: "Breakfast from", line2: "AED 5" },
    { emoji: "🍔", line1: "Lunch Combos from", line2: "AED 12" },
    { emoji: "📶", line1: "Free", line2: "WiFi" },
  ],
};

const DEFAULT_STUDY: Study = {
  title: "Study & Chill",
  subtitle: "The perfect place to eat, study and hangout.",
  image_url: img("photo-1521017432531-fbd92d768814", 1200),
  button_text: "Visit Store",
  features: [
    { icon: "Wifi", label: "Free WiFi" },
    { icon: "BatteryCharging", label: "Charging Points" },
    { icon: "Armchair", label: "Indoor Seating" },
    { icon: "Users", label: "Group Tables" },
    { icon: "MoonStar", label: "Open Late" },
  ],
};

const STUDY_ICONS: Record<string, LucideIcon> = {
  Wifi, BatteryCharging, Armchair, Users, MoonStar,
  Clock, Star, GraduationCap, Coffee, BookOpen, Zap, Music,
};

// ── Data ───────────────────────────────────────────────────────────────────

async function getKalbaData() {
  const [heroRes, bannerRes, catsRes, popularRes, studyRes, dealsRes, specialsRes] = await Promise.all([
    supabaseAdmin.from("kalba_hero").select("*").limit(1).single(),
    supabaseAdmin.from("kalba_banner").select("*").limit(1).single(),
    supabaseAdmin.from("kalba_categories").select("*").eq("is_active", true).order("sort_order"),
    supabaseAdmin.from("kalba_popular_items").select("*").eq("is_active", true).order("sort_order"),
    supabaseAdmin.from("kalba_study").select("*").limit(1).single(),
    supabaseAdmin.from("kalba_daily_deals").select("*").eq("is_active", true).order("sort_order"),
    supabaseAdmin.from("kalba_specials").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const banner = bannerRes.data ?? DEFAULT_BANNER;
  const study = studyRes.data ?? DEFAULT_STUDY;

  return {
    hero: (heroRes.data ?? DEFAULT_HERO) as Hero,
    banner: { ...banner, chips: Array.isArray(banner.chips) ? banner.chips : [] } as Banner,
    categories: (catsRes.data ?? []) as Category[],
    popular: (popularRes.data ?? []) as PopularItem[],
    study: { ...study, features: Array.isArray(study.features) ? study.features : [] } as Study,
    deals: (dealsRes.data ?? []) as DailyDeal[],
    specials: (specialsRes.data ?? []) as Special[],
  };
}

export const metadata: Metadata = {
  title: "Two in One University Kalba — Made for Students, Loved by Everyone",
  description:
    "Two in One near University of Kalba. Student-friendly prices, breakfast from AED 5, lunch combos, free WiFi and daily deals. Open 7 AM – 12 AM.",
};

// ── Components ─────────────────────────────────────────────────────────────

function BranchLogo() {
  return (
    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gray-900 flex flex-col items-center justify-center shrink-0 border-2 border-yellow-400 shadow-md">
      <svg viewBox="0 0 28 16" className="w-7 h-4 mb-0.5" fill="none">
        <path d="M14 2C8 2 2 6.5 2 13L26 13C26 6.5 20 2 14 2Z" fill="#f59e0b" />
        <rect x="2" y="13" width="24" height="2.5" rx="1.25" fill="#f59e0b" />
        <rect x="12.5" y="15.5" width="3" height="3" fill="#f59e0b" />
      </svg>
      <p className="text-white font-bold text-center leading-none" style={{ fontSize: "4.5px" }}>TWO IN ONE</p>
      <p className="text-yellow-400 font-bold text-center leading-none" style={{ fontSize: "4.5px" }}>UNIVERSITY KALBA</p>
    </div>
  );
}

function SectionHeader({ title, action, href }: { title: string; action?: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">{title}</h2>
      {action && (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-0.5 text-xs font-bold" style={{ color: "#ea580c" }}>
          {action} <ChevronRight size={14} />
        </a>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function UniversityKalbaPage() {
  const { hero, banner, categories, popular, study, deals, specials } = await getKalbaData();

  const waUrl = (text: string) =>
    `https://wa.me/${hero.whatsapp}?text=${encodeURIComponent(text)}`;
  const orderUrl = waUrl(`Hi! I'd like to place an order at ${hero.name}.`);

  return (
    <>
      <Navbar />
      <main className="bg-white pb-24 sm:pb-0">

        {/* Branch header */}
        <div className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5 flex items-center gap-3 sm:gap-4">
            <BranchLogo />
            <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-xl lg:text-2xl font-extrabold text-gray-900 leading-tight truncate">
                {hero.name}
              </h1>
              <span className="shrink-0 w-[18px] h-[18px] sm:w-5 sm:h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={3} />
              </span>
            </div>
            <a href={hero.maps_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-500 mt-0.5 hover:text-[#ea580c] transition-colors">
              <MapPin size={13} className="text-[#ea580c] shrink-0" />
              {hero.location}
            </a>
            <div className="flex items-center gap-1 sm:gap-1.5 mt-1 flex-wrap">
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-gray-800">{hero.rating}</span>
              <span className="text-xs sm:text-sm text-gray-400">({hero.rating_count})</span>
              <span className="text-gray-300 text-xs">·</span>
              <span className="text-xs sm:text-sm text-gray-500">{hero.delivery_time}</span>
              <span className="text-gray-300 text-xs">·</span>
              <span className="text-xs sm:text-sm text-gray-500">{hero.delivery_fee}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full ${hero.is_open ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {hero.is_open ? "Open" : "Closed"}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-400">· Closes {hero.closes_at}</span>
            </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4">

          {/* Hero banner */}
          <div className="mt-4 rounded-3xl overflow-hidden flex flex-col sm:flex-row"
            style={{ background: "linear-gradient(110deg, #fdf3ea 0%, #fae3d1 55%, #f5d2b8 100%)" }}>
            <div className="flex-1 p-6 sm:p-10 flex flex-col justify-center">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight text-gray-900">
                {banner.title}
                <br />
                <span style={{ color: "#ea580c" }}>{banner.title_highlight}</span>
              </h2>
              <p className="text-[13px] sm:text-sm text-gray-600 mt-2 mb-5">
                {banner.subtitle}
              </p>
              {banner.chips.length > 0 && (
                <div className="grid grid-cols-4 gap-2 max-w-md">
                  {banner.chips.map((c, i) => (
                    <div key={i} className="bg-white rounded-xl px-1.5 py-2.5 text-center shadow-sm">
                      <span className="text-lg sm:text-xl leading-none">{c.emoji}</span>
                      <p className="text-[9px] sm:text-[10px] font-semibold text-gray-600 mt-1 leading-tight">
                        {c.line1}
                        <br />
                        <span className="font-extrabold text-gray-900">{c.line2}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {banner.image_url && (
              <div className="relative h-52 overflow-hidden [border-radius:5rem_1.5rem_0_0] sm:h-auto sm:w-[45%] lg:w-[40%] sm:[border-radius:10rem_0_0_2.5rem]">
                <Image
                  src={banner.image_url}
                  alt={hero.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 45vw"
                />
              </div>
            )}
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="mt-5 rounded-3xl border border-gray-100 px-3 py-4 sm:px-6"
              style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
              <div className="flex gap-4 sm:gap-2 overflow-x-auto sm:overflow-visible sm:justify-between [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categories.map((c) => (
                  <a key={c.id} href={orderUrl} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 shrink-0 group">
                    <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl bg-orange-50 group-hover:bg-orange-100 transition-colors">
                      {c.emoji}
                    </span>
                    <span className="text-[10.5px] sm:text-[11.5px] font-semibold text-gray-700 text-center leading-tight w-16">
                      {c.label}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Popular Around Campus */}
          {popular.length > 0 && (
            <section className="mt-7">
              <SectionHeader title="Popular Around Campus" action="View All"
                href={waUrl(`Hi! I'd like to know more about your menu at ${hero.name}.`)} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {popular.map((p) => (
                  <a key={p.id} href={orderUrl} target="_blank" rel="noopener noreferrer"
                    className="bg-white rounded-2xl overflow-hidden border border-gray-100 block group transition-shadow hover:shadow-md"
                    style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                    <div className="relative h-32 sm:h-36">
                      {p.image_url && (
                        <Image src={p.image_url} alt={p.name} fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw" />
                      )}
                      <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md text-white z-10"
                        style={{ background: "#ea580c" }}>
                        AED {p.price}
                      </span>
                    </div>
                    <div className="px-3 pt-2.5 pb-3">
                      <h3 className="text-gray-900 font-extrabold text-[12.5px] leading-tight mb-1.5 min-h-[2em]">
                        {p.name}
                      </h3>
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="flex items-center gap-0.5 font-semibold text-gray-700">
                          <Star size={10} className="fill-amber-400 stroke-amber-400" />
                          {p.rating}
                        </span>
                        <span className="flex items-center gap-0.5 text-gray-400">
                          <Clock size={9} />
                          {p.time_text}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
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
                  alt={study.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 38vw"
                />
              </div>
            )}
            <div className="flex-1 py-1 sm:py-4 px-1 sm:pr-4">
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap size={20} className="text-gray-900" />
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">{study.title}</h2>
              </div>
              <p className="text-[13px] text-gray-500 mb-5">
                {study.subtitle}
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
                        <span className="text-[10px] font-medium text-gray-600 leading-tight">{f.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <a href={hero.maps_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-white text-sm font-bold transition hover:opacity-90"
                style={{ background: "#ea580c" }}>
                {study.button_text} <ChevronRight size={15} />
              </a>
            </div>
          </section>

          {/* Daily Deals */}
          {deals.length > 0 && (
            <section className="mt-7">
              <SectionHeader title="Daily Deals" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {deals.map((d) => (
                  <div key={d.id} className="rounded-2xl p-4 flex flex-col items-center text-center"
                    style={{ background: d.bg_color }}>
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: d.day_color }}>
                      {d.day}
                    </p>
                    <p className="text-[13px] font-extrabold text-gray-900 mt-0.5">{d.title}</p>
                    <span className="text-3xl my-3">{d.emoji}</span>
                    <p className="text-[11.5px] font-semibold text-gray-600">{d.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* University Specials */}
          {specials.length > 0 && (
            <section className="mt-7">
              <SectionHeader title="University Specials" action="View All"
                href={waUrl(`Hi! I'd like to know more about your university specials at ${hero.name}.`)} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {specials.map((s) => (
                  <div key={s.id}
                    className="bg-white rounded-2xl overflow-hidden border border-gray-100 group transition-shadow hover:shadow-md"
                    style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                    <div className="relative h-28 sm:h-32">
                      {s.image_url && (
                        <Image src={s.image_url} alt={s.name} fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" />
                      )}
                    </div>
                    <div className="px-3 pt-2.5 pb-3">
                      <h3 className="flex items-center gap-1 text-gray-900 font-extrabold text-[12.5px] leading-tight">
                        <GraduationCap size={13} className="text-[#ea580c] shrink-0" />
                        {s.name}
                      </h3>
                      <p className="text-gray-400 text-[10.5px] mt-1 mb-2 leading-snug">{s.description}</p>
                      {s.price_text ? (
                        <p className="text-[12px] font-extrabold" style={{ color: "#ea580c" }}>{s.price_text}</p>
                      ) : (
                        <a href={orderUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-block text-[10.5px] font-bold px-3 py-1 rounded-lg text-white"
                          style={{ background: "#ea580c" }}>
                          Order Now
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Student verify banner */}
          <section className="mt-7 mb-8 rounded-3xl px-5 py-5 sm:px-8 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ background: "linear-gradient(100deg, #fdf0e3, #fbe3cb)" }}>
            <div className="flex items-center gap-3 flex-1">
              <span className="text-3xl">🎓</span>
              <div>
                <p className="text-[14px] font-extrabold text-gray-900">{hero.student_title}</p>
                <p className="text-[12px] text-gray-600">{hero.student_subtitle}</p>
              </div>
            </div>
            <a href={waUrl(`Hi! I'm a student and I'd like to verify for student discounts at ${hero.name}.`)}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 px-6 py-3 rounded-2xl text-white text-sm font-bold transition hover:opacity-90 shrink-0"
              style={{ background: "#ea580c" }}>
              {hero.student_button} <ChevronRight size={15} />
            </a>
          </section>

        </div>
      </main>
      <Footer />
      <BottomNav />
      <WhatsAppButton />
    </>
  );
}
