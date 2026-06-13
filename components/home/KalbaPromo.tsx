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

        {/* Creative card */}
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0f0c29 0%, #1a0a00 50%, #2d1200 100%)",
            boxShadow: "0 8px 40px rgba(234,88,12,0.18)",
          }}
        >
          {/* Background glow blobs */}
          <div
            className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ background: "#ea580c", transform: "translate(30%, -30%)" }}
          />
          <div
            className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10 blur-2xl pointer-events-none"
            style={{ background: "#f59e0b", transform: "translate(-20%, 20%)" }}
          />

          {/* Dot grid decoration */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row items-stretch">
            {/* LEFT — content */}
            <div className="flex-1 px-6 py-7 sm:px-8 sm:py-8 flex flex-col justify-between">

              {/* Top row: badge + open pill */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {promo.badge && (
                  <span
                    className="text-[11px] font-extrabold px-3 py-1 rounded-full"
                    style={{ background: "rgba(234,88,12,0.9)", color: "#fff" }}
                  >
                    {promo.badge}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    isOpen
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
                >
                  {isOpen ? "● Open Now" : "● Closed"}
                </span>
              </div>

              {/* Title */}
              <div className="mb-3">
                <h3 className="text-white font-extrabold leading-tight"
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
                <p className="text-white/50 text-[11px]">{location}</p>
              </div>

              {/* Perk chips */}
              {perks.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {perks.map((p) => (
                    <span
                      key={p}
                      className="text-[11px] font-semibold px-3 py-1 rounded-full border"
                      style={{ color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)" }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-white/80">
                  <Star size={11} className="fill-yellow-400 stroke-yellow-400" />
                  {rating}
                  <span className="text-white/40 font-normal">({ratingCount})</span>
                </span>
                <span className="text-white/20">·</span>
                <span className="flex items-center gap-1 text-[11px] text-white/60">
                  <Clock size={10} />
                  {deliveryTime}
                </span>
                {promo.description && (
                  <>
                    <span className="text-white/20 hidden sm:block">·</span>
                    <span className="text-[11px] text-white/50 hidden sm:block">{promo.description}</span>
                  </>
                )}
              </div>

              {/* CTA */}
              <Link
                href="/restaurant/university-kalba"
                className="self-start inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-extrabold text-sm transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: "#ea580c",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(234,88,12,0.45)",
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
                  {/* Gradient fade on left edge so image blends into card */}
                  <div
                    className="absolute inset-y-0 left-0 w-16 z-10 pointer-events-none"
                    style={{
                      background: "linear-gradient(to right, #1a0a00, transparent)",
                    }}
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
                /* Placeholder when no image set */
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-4">
                  <span className="text-7xl sm:text-8xl select-none">🎓</span>
                  <div className="text-center">
                    <p className="text-white/30 text-xs font-semibold">Add an image</p>
                    <p className="text-white/20 text-[10px]">via Admin → Campus Promo</p>
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
