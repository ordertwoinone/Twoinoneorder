import Image from "next/image";
import { Star, ArrowRight } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface Highlight {
  id: string;
  name: string;
  cuisine: string;
  price: number;
  rating: number;
  reviews: number;
  badge: string;
  badge_color: string;
  image_url: string;
  href: string;
}

async function getHighlights(): Promise<Highlight[]> {
  const { data } = await supabaseAdmin
    .from("buffet_highlights")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data || [];
}

export default async function BuffetHighlights() {
  const highlights = await getHighlights();

  if (highlights.length === 0) return null;

  return (
    <section className="py-4 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Buffet Highlights</h2>
          <a
            href="/catering"
            className="flex items-center gap-1 text-xs font-bold"
            style={{ color: "#ea580c" }}
          >
            View All <ArrowRight size={13} />
          </a>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
          {highlights.map((b) => (
            <a
              key={b.id}
              href={b.href}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100 block group transition-shadow hover:shadow-md"
              style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
            >
              {/* Image */}
              <div className="relative" style={{ height: "180px" }}>
                <Image
                  src={b.image_url}
                  alt={b.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                {b.badge && (
                  <span
                    className="absolute top-3 left-3 text-[11px] font-bold px-3 py-1 rounded-full text-white z-10"
                    style={{ background: b.badge_color }}
                  >
                    {b.badge}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="px-3 pt-2.5 pb-3 sm:px-4 sm:pt-3 sm:pb-4">
                <h3 className="text-gray-900 font-extrabold text-[13px] sm:text-[15px] leading-tight mb-1">
                  {b.name}
                </h3>
                <p className="text-gray-400 text-[11px] sm:text-[12px] mb-1.5">{b.cuisine}</p>

                {/* Price */}
                <p className="font-extrabold text-base sm:text-lg mb-2 sm:mb-3" style={{ color: "#ea580c" }}>
                  AED {b.price}
                </p>

                {/* Rating + Book Now */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-700">
                    <Star size={11} className="fill-green-500 stroke-green-500" />
                    {b.rating}{" "}
                    <span className="text-gray-400 font-normal">({b.reviews}+)</span>
                  </span>

                  <button
                    className="text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-colors hover:bg-purple-50 w-full sm:w-auto"
                    style={{ color: b.badge_color, borderColor: b.badge_color }}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </a>
          ))}
        </div>

      </div>
    </section>
  );
}
