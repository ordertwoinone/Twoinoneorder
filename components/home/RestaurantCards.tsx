import Image from "next/image";
import { Star, Clock, Truck, Tag } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stagger } from "@/lib/stagger";
import FavoriteButton from "@/components/ui/FavoriteButton";

const BADGE_STYLE: Record<string, { bg: string; text: string }> = {
  "Free Delivery": { bg: "#16a34a", text: "#fff" },
  "Best Seller":   { bg: "#ea580c", text: "#fff" },
  "Popular":       { bg: "#dc2626", text: "#fff" },
  "New":           { bg: "#7c3aed", text: "#fff" },
};

/* The mobile list shows the badge as a soft pill next to the meta line rather
   than as a solid chip over the photo, so it needs a tinted variant. */
const BADGE_PILL: Record<string, string> = {
  "Free Delivery": "bg-green-50 text-green-700",
  "Best Seller":   "bg-orange-50 text-orange-600",
  "Popular":       "bg-red-50 text-red-600",
  "New":           "bg-purple-50 text-purple-700",
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
  offer_text: string | null;
}

async function getRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, cuisine, logo_url, food_image_url, background_image_url, rating, delivery_time, url, badge, offer_text")
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

        {/* Mobile: a full-width list, one restaurant per row — photo on the
            left, name and details on the right, favourite on the far right. */}
        <div className="flex flex-col gap-2.5 sm:hidden">
          {restaurants.map((r, i) => {
            const cardImage = r.background_image_url || r.food_image_url;
            const pill = r.badge ? BADGE_PILL[r.badge] : null;
            return (
              <div
                key={r.id}
                className="stagger-item relative flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-2 tap-shrink"
                style={{
                  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                  animationDelay: `${stagger(i)}ms`,
                }}
              >
                {/* Photo with the brand logo pinned to its bottom-left corner,
                    on a white chip so every logo reads over any artwork. */}
                <div className="relative shrink-0 w-[112px] h-[84px] rounded-xl overflow-hidden bg-gray-100">
                  {cardImage && (
                    <Image
                      src={cardImage}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  )}
                  {r.logo_url && (
                    <div className="absolute bottom-1 left-1 w-9 h-9 rounded-lg bg-white/95 shadow-sm p-1">
                      <div className="relative w-full h-full">
                        <Image src={r.logo_url} alt={r.name} fill className="object-contain" sizes="36px" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-7">
                  <h3 className="text-gray-900 font-extrabold text-[15px] leading-tight truncate">
                    {r.name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-1">
                    <span className="flex items-center gap-0.5 font-semibold text-gray-700 shrink-0">
                      <Star size={11} className="fill-orange-500 stroke-orange-500" />
                      {r.rating}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="flex items-center gap-0.5 shrink-0">
                      <Clock size={11} />
                      {r.delivery_time}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1.5">
                    {pill && (
                      <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${pill}`}>
                        {r.badge === "Free Delivery" && <Truck size={11} />}
                        {r.badge}
                      </span>
                    )}
                    {r.cuisine?.length > 0 && (
                      <span className="text-[10px] text-gray-400 truncate">
                        {r.cuisine.join(", ")}
                      </span>
                    )}
                  </div>

                  {/* Offer — its own line so a long one has room to breathe.
                      Set per restaurant in the admin panel; hidden when blank. */}
                  {r.offer_text?.trim() && (
                    <div className="mt-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md max-w-full truncate">
                        <Tag size={10} className="shrink-0" />
                        {r.offer_text}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stretched link keeps the whole row tappable while leaving the
                    favourite button outside the anchor. */}
                <a href={r.url || "#"} className="absolute inset-0 z-10" aria-label={r.name} />

                <FavoriteButton
                  itemKey={`restaurant:${r.id}`}
                  name={r.name}
                  imageUrl={cardImage}
                  href={r.url || "#"}
                  subtitle={r.cuisine?.join(", ")}
                  size={15}
                  className="absolute top-1/2 -translate-y-1/2 right-2 w-7 h-7 z-20 !bg-transparent !border-0 !shadow-none"
                />
              </div>
            );
          })}
        </div>

        {/* sm+: an even four-across grid of vertical cards. */}
        <div className="hidden sm:grid sm:grid-cols-4 sm:gap-3">
          {restaurants.map((r, i) => {
            const badge = r.badge ? BADGE_STYLE[r.badge] : null;
            // background_image_url is the dedicated slot, but it is optional and
            // currently unset everywhere — fall back to the food photo so cards
            // still get artwork, and pick up a real background if one is added.
            const cardImage = r.background_image_url || r.food_image_url;
            return (
              <a
                key={r.id}
                href={r.url || "#"}
                className="stagger-item block bg-white rounded-2xl overflow-hidden border border-gray-100 transition-shadow hover:shadow-md group tap-shrink"
                style={{
                  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                  animationDelay: `${stagger(i)}ms`,
                }}
              >
                {/* Photo fills the tile, with the brand logo pinned to the top
                    right. The logo sits on a white chip at a fixed size so every
                    brand reads clearly over the photo whatever its aspect ratio
                    or colour. */}
                <div className="relative bg-gray-100 overflow-hidden h-[120px]">
                  {cardImage && (
                    <Image
                      src={cardImage}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="25vw"
                    />
                  )}

                  {badge && (
                    <span
                      className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 max-w-[calc(100%-44px)] truncate"
                      style={{ background: badge.bg, color: badge.text }}
                    >
                      {r.badge}
                    </span>
                  )}

                  {r.logo_url && (
                    <div className="absolute top-2 right-2 z-10 w-10 h-10 rounded-lg bg-white/95 shadow-sm p-1.5">
                      <div className="relative w-full h-full">
                        <Image
                          src={r.logo_url}
                          alt={r.name}
                          fill
                          className="object-contain"
                          sizes="40px"
                        />
                      </div>
                    </div>
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

                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1 text-gray-500 text-[11px] font-medium whitespace-nowrap">
                      <Clock size={11} />
                      {r.delivery_time}
                    </span>
                    <span
                      className="flex items-center gap-0.5 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
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
