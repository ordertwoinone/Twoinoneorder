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
  background_image_url: string | null;
  rating: number;
  delivery_time: string;
  url: string;
  badge: string | null;
}

async function getRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, cuisine, logo_url, food_image_url, background_image_url, rating, delivery_time, url, badge")
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
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
          {restaurants.map((r) => {
            const badge = r.badge ? BADGE_STYLE[r.badge] : null;
            return (
              <a
                key={r.id}
                href={r.url || "#"}
                className="block bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-gray-100 transition-shadow hover:shadow-md group tap-shrink"
                style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
              >
                {/* Brand logo tile — optional background image behind a
                    fixed-size, centered logo box so every logo renders at a
                    consistent visual size regardless of its aspect ratio */}
                <div className="relative bg-white overflow-hidden h-[74px] sm:h-[120px]">
                  {r.background_image_url && (
                    <Image
                      src={r.background_image_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="25vw"
                    />
                  )}

                  {r.logo_url ? (
                    <div className="absolute inset-0 flex items-center justify-center p-1.5 sm:p-3">
                      <div className="relative w-[52px] h-[52px] sm:w-20 sm:h-20 transition-transform duration-500 group-hover:scale-105">
                        <Image
                          src={r.logo_url}
                          alt={r.name}
                          fill
                          className="object-contain"
                          sizes="80px"
                        />
                      </div>
                    </div>
                  ) : (
                    !r.background_image_url && <div className="w-full h-full bg-gray-100" />
                  )}

                  {badge && (
                    <span
                      className="absolute top-1 left-1 sm:top-2 sm:left-2 text-[7px] sm:text-[10px] font-bold px-1 sm:px-2 py-0.5 rounded-full z-10 max-w-[calc(100%-8px)] truncate"
                      style={{ background: badge.bg, color: badge.text }}
                    >
                      {r.badge}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="px-1.5 pt-1.5 pb-2 sm:px-3 sm:pt-2.5 sm:pb-3">
                  <h3 className="text-gray-900 font-extrabold text-[10px] sm:text-sm leading-tight mb-0.5 truncate">
                    {r.name}
                  </h3>
                  <p className="text-gray-400 text-[8px] sm:text-[11px] truncate mb-1 sm:mb-2.5">
                    {r.cuisine?.join(", ")}
                  </p>

                  <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                    <span className="flex items-center gap-0.5 sm:gap-1 text-gray-500 text-[8px] sm:text-[11px] font-medium whitespace-nowrap">
                      <Clock size={9} className="sm:hidden" />
                      <Clock size={11} className="hidden sm:block" />
                      {r.delivery_time}
                    </span>
                    <span
                      className="flex items-center gap-0.5 text-white text-[8px] sm:text-[11px] font-bold px-1 sm:px-1.5 py-0.5 rounded sm:rounded-md"
                      style={{ background: "#16a34a" }}
                    >
                      <Star size={8} className="fill-white stroke-white sm:hidden" />
                      <Star size={10} className="fill-white stroke-white hidden sm:block" />
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
