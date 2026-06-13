import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
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

export default async function KalbaPromo() {
  const raw = await getPromo();
  const promo: CampusPromo = raw ? { ...DEFAULTS, ...raw } : DEFAULTS;

  if (!promo.is_active) return null;

  const perks = [promo.perk1, promo.perk2, promo.perk3].filter(Boolean);

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
            View Menu <ArrowRight size={13} />
          </Link>
        </div>

        {/* Card */}
        <div
          className="relative rounded-3xl overflow-hidden flex flex-col sm:flex-row"
          style={{
            background:
              "linear-gradient(110deg, #fdf3ea 0%, #fae3d1 55%, #f5d2b8 100%)",
          }}
        >
          {/* Left content */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center">
            {/* Badge */}
            {promo.badge && (
              <span
                className="inline-flex items-center self-start mb-3 text-[11px] font-bold px-3 py-1 rounded-full border"
                style={{ color: "#ea580c", borderColor: "#ea580c", background: "rgba(234,88,12,0.08)" }}
              >
                {promo.badge}
              </span>
            )}

            {/* Title */}
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 leading-tight">
              {promo.title}
            </h3>

            {/* Subtitle */}
            {promo.subtitle && (
              <p
                className="text-base sm:text-lg font-extrabold mt-0.5 leading-tight"
                style={{ color: "#ea580c" }}
              >
                {promo.subtitle}
              </p>
            )}

            {/* Description */}
            {promo.description && (
              <p className="text-[13px] sm:text-sm text-gray-500 mt-2">
                {promo.description}
              </p>
            )}

            {/* Perks */}
            {perks.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {perks.map((p) => (
                  <span
                    key={p}
                    className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white text-gray-700 shadow-sm border border-gray-100"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}

            {/* CTA */}
            <Link
              href="/restaurant/university-kalba"
              className="mt-5 self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white font-extrabold text-sm hover:opacity-90 active:scale-95 transition-all shadow-md"
              style={{ background: "#ea580c" }}
            >
              {promo.button_text || "View Menu"}
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Right image */}
          {promo.image_url && (
            <div className="relative h-52 overflow-hidden [border-radius:5rem_1.5rem_0_0] sm:h-auto sm:w-[42%] lg:w-[38%] sm:[border-radius:10rem_0_0_2.5rem]">
              <Image
                src={promo.image_url}
                alt={promo.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 42vw"
              />
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
