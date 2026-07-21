import Image from "next/image";
import { Star, Clock } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BADGE_STYLE: Record<string, { bg: string; text: string }> = {
  "Free Delivery": { bg: "#16a34a", text: "#fff" },
  "Best Seller":   { bg: "#ea580c", text: "#fff" },
  "Popular":       { bg: "#dc2626", text: "#fff" },
  "New":           { bg: "#7c3aed", text: "#fff" },
};

interface Restaurant {
  id: string;
  name: string;
  cuisine: string[];
  logo_url: string;
  food_image_url: string;
  rating: number;
  delivery_time: string;
  url: string;
  badge: string | null;
}

async function getRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, cuisine, logo_url, food_image_url, rating, delivery_time, url, badge")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !data?.length) return [];
  return data;
}

export default async function RestaurantCards() {
  const restaurants = await getRestaurants();

  if (restaurants.length === 0) return null;

  return (
    <section id="restaurants" className="py-4">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Our Restaurants</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Tap to order · Fast delivery across UAE</p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {restaurants.map((r) => {
            const badge = r.badge ? BADGE_STYLE[r.badge] : null;
            return (
              <a
                key={r.id}
                href={r.url || "#"}
                className="block bg-white rounded-2xl overflow-hidden border border-gray-100 transition-shadow hover:shadow-md group tap-shrink"
                style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
              >
                {/* Brand logo tile — contain + padding so every logo shows fully
                    at a consistent size regardless of its aspect ratio */}
                <div className="relative bg-white" style={{ height: "120px" }}>
                  {r.logo_url ? (
                    <Image
                      src={r.logo_url}
                      alt={r.name}
                      fill
                      className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100" />
                  )}

                  {badge && (
                    <span
                      className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full z-10"
                      style={{ background: badge.bg, color: badge.text }}
                    >
                      {r.badge}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="px-3 pt-2.5 pb-3">
                  <h3 className="text-gray-900 font-extrabold text-sm leading-tight mb-0.5 truncate">
                    {r.name}
                  </h3>
                  <p className="text-gray-400 text-[11px] truncate mb-2.5">
                    {r.cuisine?.join(", ")}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-gray-500 text-[11px] font-medium">
                      <Clock size={11} />
                      {r.delivery_time}
                    </span>
                    <span
                      className="flex items-center gap-0.5 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: "#16a34a" }}
                    >
                      <Star size={10} className="fill-white stroke-white" />
                      {r.rating}
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
