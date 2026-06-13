import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star, Clock, MapPin } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface CampusPromo {
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  image_url: string;
  button_text: string;
  perk1: string;
  perk2: string;
  perk3: string;
  is_active: boolean;
}

const DEFAULTS: CampusPromo = {
  title: "Two in One University Kalba",
  subtitle: "Made for Students, Loved by Everyone!",
  description: "Student-friendly prices · Fresh food · Free WiFi",
  badge: "🎓 On Campus",
  image_url: "",
  button_text: "View Menu",
  perk1: "Student Prices",
  perk2: "Free WiFi",
  perk3: "Open Late",
  is_active: true,
};

async function getPromo(): Promise<CampusPromo | null> {
  const { data } = await supabaseAdmin
    .from("campus_promo")
    .select("*")
    .limit(1)
    .single();
  return data ?? null;
}

async function getKalbaStats() {
  const { data } = await supabaseAdmin
    .from("kalba_hero")
    .select("rating, rating_count, delivery_time, location, is_open")
    .limit(1)
    .single();
  return data;
}

export default async function KalbaPromo() {
  const [raw, stats] = await Promise.all([getPromo(), getKalbaStats()]);
  const promo: CampusPromo = raw ? { ...DEFAULTS, ...raw } : DEFAULTS;

  if (!promo.is_active) return null;

  const perks = [promo.perk1, promo.perk2, promo.perk3].filter(Boolean);
  const rating = stats?.rating ?? "4.6";
  const ratingCount = stats?.rating_count ?? "500+";
  const deliveryTime = stats?.delivery_time ?? "15–25 min";
  const location = stats?.location ?? "Near University of Kalba";
  const isOpen = stats?.is_open ?? true;

  return (
    <section className="py-4 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
            Now Open on Campus
          </h2>
          <Link
            href="/restaurant/university-kalba"
            className="flex items-center gap-1 text-xs font-bold"
            style={{ color: "#ea580c" }}
          >
            Explore <ArrowRight size={13} />
          </Link>
        </div>

        {/* Card */}
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(120deg, #fff8f2 0%, #fdeede 50%, #fde3c8 100%)",
            boxShadow: "0 4px 24px rgba(234,88,12,0.10)",
            border: "1px solid #fcd9b6",
          }}
        >
          {/* Subtle dot grid */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #ea580c 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row items-stretch">
            {/* LEFT — content */}
            <div className="flex-1 px-6 py-7 sm:px-8 sm:py-8 flex flex-col justify-between">

              {/* Badge + open pill */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {promo.badge && (
                  <span
                    className="text-[11px] font-extrabold px-3 py-1 rounded-full text-white"
                    style={{ background: "#ea580c" }}
                  >
                    {promo.badge}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isOpen
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-600 border-red-200"
                  }`}
                >
                  {isOpen ? "● Open Now" : "● Closed"}
                </span>
              </div>

              {/* Title */}
              <div className="mb-3">
                <h3 className="text-gray-900 font-extrabold leading-tight"
                  style={{ fontSize: "clamp(20px, 4vw, 30px)" }}>
                  {promo.title}
                </h3>
                {promo.subtitle && (
                  <p
                    className="font-extrabold leading-tight mt-1"
                    style={{ fontSize: "clamp(13px, 2.5vw, 18px)", color: "#ea580c" }}
                  >
                    {promo.subtitle}
                  </p>
                )}
              </div>

              {/* Location */}
              <div className="flex items-center gap-1.5 mb-4">
                <MapPin size={12} className="text-orange-400 shrink-0" />
                <p className="text-gray-500 text-[11px]">{location}</p>
              </div>

              {/* Perk chips */}
              {perks.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {perks.map((p) => (
                    <span
                      key={p}
                      className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white border border-orange-200 text-gray-700"
                      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-700">
                  <Star size={11} className="fill-yellow-400 stroke-yellow-400" />
                  {rating}
                  <span className="text-gray-400 font-normal">({ratingCount})</span>
                </span>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1 text-[11px] text-gray-500">
                  <Clock size={10} />
                  {deliveryTime}
                </span>
                {promo.description && (
                  <>
                    <span className="text-gray-300 hidden sm:block">·</span>
                    <span className="text-[11px] text-gray-500 hidden sm:block">{promo.description}</span>
                  </>
                )}
              </div>

              {/* CTA */}
              <Link
                href="/restaurant/university-kalba"
                className="self-start inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-extrabold text-sm text-white transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: "#ea580c",
                  boxShadow: "0 4px 16px rgba(234,88,12,0.35)",
                }}
              >
                {promo.button_text || "View Menu"}
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* RIGHT — image */}
            <div className="relative sm:w-[42%] lg:w-[38%] h-56 sm:h-auto shrink-0">
              {promo.image_url ? (
                <>
                  <div
                    className="absolute inset-y-0 left-0 w-16 z-10 pointer-events-none"
                    style={{ background: "linear-gradient(to right, #fde3c8, transparent)" }}
                  />
                  <Image
                    src={promo.image_url}
                    alt={promo.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 42vw"
                  />
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-4">
                  <span className="text-7xl sm:text-8xl select-none">🎓</span>
                  <div className="text-center">
                    <p className="text-gray-400 text-xs font-semibold">Add an image</p>
                    <p className="text-gray-300 text-[10px]">via Admin → Campus Promo</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom accent bar */}
          <div
            className="h-1 w-full"
            style={{ background: "linear-gradient(90deg, #ea580c, #f59e0b, #ea580c)" }}
          />
        </div>

      </div>
    </section>
  );
}
