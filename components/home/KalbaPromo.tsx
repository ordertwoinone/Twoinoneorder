import Link from "next/link";
import { GraduationCap, ArrowRight, Wifi, Clock, Star, MapPin } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function getKalbaHero() {
  const { data } = await supabaseAdmin
    .from("kalba_hero")
    .select("name, location, rating, rating_count, delivery_time, is_open, closes_at")
    .limit(1)
    .single();
  return data;
}

const PERKS = [
  { icon: GraduationCap, label: "Student Prices" },
  { icon: Wifi,          label: "Free WiFi"      },
  { icon: Clock,         label: "Open Late"       },
];

export default async function KalbaPromo() {
  const hero = await getKalbaHero();

  const name     = hero?.name        || "Two in One University Kalba";
  const location = hero?.location    || "Near University of Kalba";
  const rating   = hero?.rating      || "4.6";
  const reviews  = hero?.rating_count || "500+";
  const time     = hero?.delivery_time || "15–25 min";
  const isOpen   = hero?.is_open ?? true;
  const closesAt = hero?.closes_at   || "12:00 AM";

  return (
    <section className="py-4 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Section label */}
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
          style={{ background: "linear-gradient(120deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)" }}
        >
          {/* Decorative circles */}
          <span className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
            style={{ background: "#ea580c" }} />
          <span className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full opacity-10"
            style={{ background: "#f59e0b" }} />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 px-5 py-6 sm:px-8 sm:py-7">

            {/* Icon + name */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Logo circle */}
              <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 border border-white/20 flex flex-col items-center justify-center">
                <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-extrabold text-base sm:text-lg leading-tight">
                    {name}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isOpen ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {isOpen ? "Open" : "Closed"}
                  </span>
                </div>

                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={11} className="text-orange-400 shrink-0" />
                  <p className="text-white/60 text-[11px] truncate">{location}</p>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="flex items-center gap-1 text-[11px] text-white/80 font-semibold">
                    <Star size={11} className="fill-yellow-400 stroke-yellow-400" />
                    {rating}
                    <span className="text-white/40 font-normal">({reviews})</span>
                  </span>
                  <span className="text-white/30 text-xs">·</span>
                  <span className="flex items-center gap-1 text-[11px] text-white/70">
                    <Clock size={10} />
                    {time}
                  </span>
                  <span className="text-white/30 text-xs">·</span>
                  <span className="text-[11px] text-white/50">Closes {closesAt}</span>
                </div>

                {/* Perks */}
                <div className="flex items-center gap-3 mt-3">
                  {PERKS.map(({ icon: Icon, label }) => (
                    <span key={label}
                      className="flex items-center gap-1 text-[10px] font-semibold text-white/70 bg-white/10 rounded-full px-2.5 py-1">
                      <Icon size={10} className="text-orange-400" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/restaurant/university-kalba"
              className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-extrabold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg"
              style={{ background: "#ea580c" }}
            >
              View Menu
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
