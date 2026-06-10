import Image from "next/image";
import { Star, Clock, ArrowRight } from "lucide-react";
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Our Restaurants</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Tap to order · Fast delivery across UAE</p>
          </div>
          <a
            href="#restaurants"
            className="flex items-center gap-1 text-xs font-bold"
            style={{ color: "#ea580c" }}
          >
            View All <ArrowRight size={13} />
          </a>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-3 px-4 lg:grid-cols-4">
          {restaurants.map((r) => {
            const badge = r.badge ? BADGE_STYLE[r.badge] : null;
            return (
              <a
                key={r.id}
                href={r.url || "#"}
                className="block bg-white rounded-2xl overflow-hidden border border-gray-100 transition-shadow hover:shadow-md group"
                style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
              >
                {/* Image */}
                <div className="relative" style={{ height: "120px" }}>
                  {r.food_image_url ? (
                    <Image
                      src={r.food_image_url}
                      alt={r.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
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

                  {r.logo_url && (
                    <div className="absolute top-2 right-2 w-9 h-9 rounded-xl bg-white shadow-sm overflow-hidden p-1 z-10">
                      <Image
                        src={r.logo_url}
                        alt={`${r.name} logo`}
                        width={32}
                        height={32}
                        className="object-contain w-full h-full"
                      />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-3 pt-2.5 pb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500">
                      <Star size={10} className="fill-amber-400 stroke-amber-400" />
                      {r.rating}
                    </span>
                    <span className="text-gray-300 text-[10px]">·</span>
                    <span className="flex items-center gap-0.5 text-gray-400 text-[10px]">
                      <Clock size={9} />
                      {r.delivery_time}
                    </span>
                  </div>
                  <h3 className="text-gray-900 font-extrabold text-sm leading-tight mb-0.5 truncate">
                    {r.name}
                  </h3>
                  <p className="text-gray-400 text-[10px] truncate mb-1.5">
                    {r.cuisine?.join(", ")}
                  </p>
                  <p className="text-[11px] font-semibold" style={{ color: "#16a34a" }}>
                    Free delivery
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
