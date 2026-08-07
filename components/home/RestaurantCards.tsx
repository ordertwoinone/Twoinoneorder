import Image from "next/image";
import { Star, Clock, Bike } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stagger } from "@/lib/stagger";
import { T } from "@/lib/i18n/T";
import { L } from "@/lib/i18n/localized";

/* Fallback palettes, used when a restaurant carries no colours of its own.
   Anything outside these four names lands on the neutral grey. */
const BADGE_STYLE: Record<string, { bg: string; text: string }> = {
  "Free Delivery": { bg: "#16a34a", text: "#fff" },
  "Best Seller":   { bg: "#ea580c", text: "#fff" },
  "Popular":       { bg: "#dc2626", text: "#fff" },
  "New":           { bg: "#7c3aed", text: "#fff" },
};
const BADGE_FALLBACK = { bg: "#6b7280", text: "#fff" };

/* The mobile list shows the badge as a soft pill under the meta lines rather
   than as a solid chip over the photo, so it needs a tinted variant. */
const BADGE_PILL: Record<string, { bg: string; text: string }> = {
  "Best Seller": { bg: "#fff7ed", text: "#ea580c" },
  "Popular":     { bg: "#fef2f2", text: "#dc2626" },
  "New":         { bg: "#faf5ff", text: "#7c3aed" },
};
const BADGE_PILL_FALLBACK = { bg: "#f3f4f6", text: "#4b5563" };
const OFFER_FALLBACK = { bg: "#FEF3C7", text: "#8A6100" };

interface Restaurant {
  id: string;
  name: string;
  name_ar: string | null;
  cuisine: string[];
  cuisine_ar: string[] | null;
  logo_url: string;
  food_image_url: string;
  background_image_url: string | null;
  rating: number;
  delivery_time: string;
  delivery_time_ar: string | null;
  url: string;
  badge: string | null;
  badge_ar: string | null;
  offer_text: string | null;
  offer_text_ar: string | null;
  free_delivery: boolean | null;
  badge_bg_color: string | null;
  badge_text_color: string | null;
  offer_bg_color: string | null;
  offer_text_color: string | null;
}

/* A blank colour on the row means "use the built-in one", so each half falls
   back on its own — setting only a background still reads. */
function pillColors(
  bg: string | null | undefined,
  text: string | null | undefined,
  fallback: { bg: string; text: string },
) {
  return {
    background: bg?.trim() || fallback.bg,
    color: text?.trim() || fallback.text,
  };
}

const BASE_COLUMNS =
  "id, name, cuisine, logo_url, food_image_url, background_image_url, rating, delivery_time, url, badge, offer_text";
/* Added by supabase/arabic_translations.sql. Queried separately from the
   colour columns so a database that has run one migration but not the other
   still renders. */
const ARABIC_COLUMNS = "name_ar, cuisine_ar, delivery_time_ar, badge_ar, offer_text_ar";
/* Added by supabase/restaurant_card_colors.sql and restaurant_free_delivery.sql. */
const EXTRA_COLUMNS =
  "free_delivery, badge_bg_color, badge_text_color, offer_bg_color, offer_text_color";

function query(columns: string) {
  return supabaseAdmin
    .from("restaurants")
    .select(columns)
    .eq("is_active", true)
    // Position is set by the arrows in admin → Restaurants; newest-first only
    // breaks ties between rows that share a position.
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
}

const BLANK_ARABIC = {
  name_ar: null,
  cuisine_ar: null,
  delivery_time_ar: null,
  badge_ar: null,
  offer_text_ar: null,
};

const BLANK_EXTRAS = {
  free_delivery: null,
  badge_bg_color: null,
  badge_text_color: null,
  offer_bg_color: null,
  offer_text_color: null,
};

/**
 * PostgREST rejects the whole select if one column is unknown, so a database
 * that has not run the latest migration would blank the entire section. Ask for
 * everything first, then step down a tier at a time — a site that has run the
 * colour migration but not the Arabic one still renders its cards, just without
 * the translations.
 */
async function getRestaurants(): Promise<Restaurant[]> {
  const full = await query(`${BASE_COLUMNS}, ${EXTRA_COLUMNS}, ${ARABIC_COLUMNS}`);
  if (!full.error) return (full.data as unknown as Restaurant[]) ?? [];

  const noArabic = await query(`${BASE_COLUMNS}, ${EXTRA_COLUMNS}`);
  if (!noArabic.error) {
    return ((noArabic.data as unknown as Restaurant[]) ?? []).map((r) => ({
      ...BLANK_ARABIC,
      ...r,
    }));
  }

  const base = await query(BASE_COLUMNS);
  if (base.error || !base.data?.length) return [];
  return (base.data as unknown as Restaurant[]).map((r) => ({
    ...BLANK_ARABIC,
    ...BLANK_EXTRAS,
    ...r,
  }));
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
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
              <T k="home.restaurantsTitle" />
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              <T k="home.restaurantsSubtitle" />
            </p>
          </div>
        </div>

        {/* Mobile: a full-width list, one restaurant per row — photo on the
            left, name and details on the right. Nothing is clipped: long names,
            cuisine lists and offers all wrap and the row grows to suit. */}
        <div className="flex flex-col gap-2.5 sm:hidden">
          {restaurants.map((r, i) => {
            const cardImage = r.background_image_url || r.food_image_url;
            const freeDelivery = !!r.free_delivery;
            const badgeLabel = r.badge?.trim();
            return (
              <div
                key={r.id}
                className="stagger-item relative flex items-start gap-3 bg-white rounded-2xl border border-gray-100 p-2 tap-shrink"
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
                    <div className="absolute bottom-1 start-1 w-9 h-9 rounded-lg bg-white/95 shadow-sm p-1">
                      <div className="relative w-full h-full">
                        <Image src={r.logo_url} alt={r.name} fill className="object-contain" sizes="36px" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-900 font-extrabold text-[16px] leading-snug">
                    <L en={r.name} ar={r.name_ar} />
                  </h3>

                  {/* Rating and delivery time share a line. */}
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-gray-500 mt-1">
                    <span className="flex items-center gap-1 font-bold text-gray-800">
                      <Star size={13} className="fill-orange-500 stroke-orange-500" />
                      {r.rating}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Clock size={12} />
                      <L en={r.delivery_time} ar={r.delivery_time_ar} />
                    </span>
                  </div>

                  {/* Cuisines, led by a green free drop when the restaurant
                      delivers for nothing — set by the tick in the admin panel. */}
                  {(freeDelivery || r.cuisine?.length > 0) && (
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-gray-400 mt-1">
                      {freeDelivery && (
                        <>
                          <span className="flex items-center gap-1 font-semibold text-green-600">
                            <Bike size={13} />
                            <T k="common.free" />
                          </span>
                          {r.cuisine?.length > 0 && <span className="text-gray-300">·</span>}
                        </>
                      )}
                      {r.cuisine?.length > 0 && (
                        <span>
                          <L
                            en={r.cuisine.join(", ")}
                            ar={r.cuisine_ar?.length ? r.cuisine_ar.join("، ") : null}
                          />
                        </span>
                      )}
                    </div>
                  )}

                  {/* Both pills hold one row, so they run small. Colours are set
                      per restaurant in the admin panel. */}
                  {(badgeLabel || r.offer_text?.trim()) && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {badgeLabel && (
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap"
                          style={pillColors(
                            r.badge_bg_color,
                            r.badge_text_color,
                            BADGE_PILL[badgeLabel] || BADGE_PILL_FALLBACK,
                          )}
                        >
                          <L en={badgeLabel} ar={r.badge_ar} />
                        </span>
                      )}
                      {r.offer_text?.trim() && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-md min-w-0 truncate leading-relaxed"
                          style={pillColors(r.offer_bg_color, r.offer_text_color, OFFER_FALLBACK)}
                        >
                          <L en={r.offer_text} ar={r.offer_text_ar} />
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Stretched link keeps the whole row tappable. */}
                <a href={r.url || "#"} className="absolute inset-0 z-10" aria-label={r.name} />
              </div>
            );
          })}
        </div>

        {/* sm+: an even four-across grid of vertical cards. */}
        <div className="hidden sm:grid sm:grid-cols-4 sm:gap-3">
          {restaurants.map((r, i) => {
            const badgeLabel = r.badge?.trim();
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

                  {badgeLabel && (
                    <span
                      className="absolute top-2 start-2 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 max-w-[calc(100%-44px)] truncate"
                      style={pillColors(
                        r.badge_bg_color,
                        r.badge_text_color,
                        BADGE_STYLE[badgeLabel] || BADGE_FALLBACK,
                      )}
                    >
                      <L en={badgeLabel} ar={r.badge_ar} />
                    </span>
                  )}

                  {r.logo_url && (
                    <div className="absolute top-2 end-2 z-10 w-10 h-10 rounded-lg bg-white/95 shadow-sm p-1.5">
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
                    <L en={r.name} ar={r.name_ar} />
                  </h3>
                  <p className="text-gray-400 text-[11px] truncate mb-2.5">
                    <L
                      en={r.cuisine?.join(", ")}
                      ar={r.cuisine_ar?.length ? r.cuisine_ar.join("، ") : null}
                    />
                  </p>

                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1 text-gray-500 text-[11px] font-medium whitespace-nowrap">
                      <Clock size={11} />
                      <L en={r.delivery_time} ar={r.delivery_time_ar} />
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
