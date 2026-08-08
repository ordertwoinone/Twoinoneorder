import Image from "next/image";
import { Plus } from "lucide-react";
import FavoriteButton from "@/components/ui/FavoriteButton";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stagger } from "@/lib/stagger";
import { T } from "@/lib/i18n/T";
import { L } from "@/lib/i18n/localized";
import TopPickSubtitle from "./TopPickSubtitle";

/** Normalised shape every source table is mapped into. */
interface Pick {
  key: string;
  name: string;
  /** Admin's Arabic twin of `name`, when there is one. */
  nameAr: string | null;
  /** `currency: true` means "wrap in the AED pattern for the active language". */
  price: { amount: string; currency: boolean } | null;
  imageUrl: string;
  href: string;
  /** Dictionary key when the label is ours, otherwise plain admin text. */
  subtitleKey: string | null;
  subtitle: string;
  /** Arabic twin of an admin-entered subtitle (a dish tag, a restaurant name). */
  subtitleAr: string | null;
  order: number;
  sortOrder: number;
}

/**
 * "12" / 12 / "AED 12" → "12.00", which the client then renders with the
 * currency on the correct side for the language. Free text that carries no
 * usable number is passed through untouched.
 */
function formatPrice(raw: string | number | null | undefined): Pick["price"] {
  if (raw === null || raw === undefined || raw === "") return null;
  const text = String(raw).trim();
  const n = parseFloat(text.replace(/aed/i, "").replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) {
    return /\d/.test(text) ? { amount: text, currency: false } : null;
  }
  return { amount: n.toFixed(2), currency: true };
}

/** An embedded to-one relation comes back as an object, or an array in some shapes. */
function restaurantName(relation: unknown, field: "name" | "name_ar" = "name"): string | null {
  const row = Array.isArray(relation) ? relation[0] : relation;
  const name = (row as Record<string, unknown> | null)?.[field];
  return typeof name === "string" && name ? name : null;
}

/**
 * Items are spread across the per-area admin tables plus the menus imported
 * from the restaurants' storefronts; each one carries a show_in_top_picks
 * flag. Pull the flagged rows from every source and merge them into a single
 * strip ordered by top_picks_order.
 */
async function getPicks(): Promise<Pick[]> {
  const [menuItems, buffetDishes, kalbaPopular, kalbaSpecials, imported] = await Promise.all([
    supabaseAdmin
      .from("buffet_menu_items")
      .select("*")
      .eq("is_active", true)
      .eq("show_in_top_picks", true),
    supabaseAdmin
      .from("buffet_popular_dishes")
      .select("*")
      .eq("is_active", true)
      .eq("show_in_top_picks", true),
    supabaseAdmin
      .from("kalba_popular_items")
      .select("*")
      .eq("is_active", true)
      .eq("show_in_top_picks", true),
    supabaseAdmin
      .from("kalba_specials")
      .select("*")
      .eq("is_active", true)
      .eq("show_in_top_picks", true),
    // Items imported from the restaurants' ordering storefronts. These are the
    // only source with a real per-item order link.
    supabaseAdmin
      .from("restaurant_menu_items")
      .select("*, restaurants(name, name_ar)")
      .eq("is_available", true)
      .eq("show_in_top_picks", true),
  ]);

  const picks: Pick[] = [
    ...(menuItems.data ?? []).map((r) => ({
      key: `buffetmenu:${r.id}`,
      name: r.name,
      nameAr: r.name_ar ?? null,
      price: formatPrice(r.price),
      imageUrl: r.image_url,
      href: "/restaurant/buffet",
      subtitleKey: "home.subtitles.buffetMenu",
      subtitle: "Buffet menu",
      subtitleAr: null,
      order: r.top_picks_order ?? 0,
      sortOrder: r.sort_order ?? 0,
    })),
    ...(buffetDishes.data ?? []).map((r) => ({
      key: `buffetdish:${r.id}`,
      name: r.name,
      nameAr: r.name_ar ?? null,
      price: null,
      imageUrl: r.image_url,
      href: "/restaurant/buffet",
      subtitleKey: r.tag ? null : "home.subtitles.buffetDish",
      subtitle: r.tag || "Buffet dish",
      subtitleAr: r.tag_ar ?? null,
      order: r.top_picks_order ?? 0,
      sortOrder: r.sort_order ?? 0,
    })),
    ...(kalbaPopular.data ?? []).map((r) => ({
      key: `kalbapopular:${r.id}`,
      name: r.name,
      nameAr: r.name_ar ?? null,
      price: formatPrice(r.price),
      imageUrl: r.image_url,
      href: "/restaurant/university-kalba",
      subtitleKey: "home.subtitles.universityKalba",
      subtitle: "University Kalba",
      subtitleAr: null,
      order: r.top_picks_order ?? 0,
      sortOrder: r.sort_order ?? 0,
    })),
    ...(kalbaSpecials.data ?? []).map((r) => ({
      key: `kalbaspecial:${r.id}`,
      name: r.name,
      nameAr: r.name_ar ?? null,
      price: formatPrice(r.price_text),
      imageUrl: r.image_url,
      href: "/restaurant/university-kalba",
      subtitleKey: "home.subtitles.universityKalba",
      subtitle: "University Kalba",
      subtitleAr: null,
      order: r.top_picks_order ?? 0,
      sortOrder: r.sort_order ?? 0,
    })),
    ...(imported.data ?? []).map((r) => ({
      key: `menuitem:${r.id}`,
      name: r.name,
      nameAr: r.name_ar ?? null,
      price: formatPrice(r.price),
      imageUrl: r.image_url,
      // Straight to the item on the restaurant's own ordering site.
      href: r.product_url || "#",
      subtitleKey: restaurantName(r.restaurants) ? null : "home.subtitles.orderNow",
      subtitle: restaurantName(r.restaurants) ?? "Order now",
      subtitleAr: restaurantName(r.restaurants, "name_ar"),
      order: r.top_picks_order ?? 0,
      sortOrder: 0,
    })),
  ];

  return picks
    .filter((p) => p.name && p.imageUrl)
    .sort((a, b) => a.order - b.order || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export default async function TopPicks() {
  const picks = await getPicks();

  // Nothing flagged in the admin panel yet — render nothing rather than an
  // empty heading.
  if (picks.length === 0) return null;

  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto">
        <div className="px-4 mb-3">
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
            <T k="home.topPicksTitle" />
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            <T k="home.topPicksSubtitle" />
          </p>
        </div>

        {/* Mobile: horizontal swipe strip. Desktop: even grid. */}
        {/* Mobile: two rows that scroll sideways — grid-flow-col fills top to
            bottom, then moves to the next column, with each column sized so
            three sit in view. scroll-ps-4 matches the px-4 inset (see
            HomeCategories: snapping otherwise pulls the first card flush to the
            screen edge). sm+: a plain single-row grid. */}
        <div className="grid grid-flow-col grid-rows-2 auto-cols-[calc((100vw-3.5rem)/3)] gap-3 overflow-x-auto scrollbar-none momentum-x px-4 scroll-ps-4 sm:grid-flow-row sm:grid-rows-none sm:auto-cols-auto sm:grid-cols-4 lg:grid-cols-5 sm:gap-4 sm:overflow-visible">
          {picks.map((p, i) => (
            <div
              key={p.key}
              // Width comes from the grid's column sizing, not the card.
              className="stagger-item relative bg-white rounded-2xl overflow-hidden border border-gray-100 transition-shadow hover:shadow-md group snap-item tap-shrink"
              style={{
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                animationDelay: `${stagger(i, 45)}ms`,
              }}
            >
              <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                <Image
                  src={p.imageUrl}
                  alt={p.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 33vw, 20vw"
                />
              </div>

              <div className="px-2 pt-2 pb-2.5 sm:px-2.5">
                <h3 className="text-gray-900 font-bold text-[11px] sm:text-[12px] leading-snug line-clamp-2 min-h-[2.4em]">
                  <L en={p.name} ar={p.nameAr} />
                </h3>
                <div className="flex items-center justify-between gap-1 mt-1.5">
                  <span className="text-[11px] sm:text-[12px] font-extrabold truncate" style={{ color: "#ea580c" }}>
                    <TopPickSubtitle
                      price={p.price}
                      subtitleKey={p.subtitleKey}
                      subtitle={p.subtitle}
                      subtitleAr={p.subtitleAr}
                    />
                  </span>
                  <span
                    aria-hidden
                    className="flex items-center justify-center w-[22px] h-[22px] sm:w-6 sm:h-6 rounded-lg text-white shrink-0"
                    style={{ background: "#ea580c" }}
                  >
                    <Plus size={13} strokeWidth={3} />
                  </span>
                </div>
              </div>

              {/* Stretched link keeps the whole card clickable while leaving the
                  favourite button outside the anchor. */}
              <a href={p.href} className="absolute inset-0 z-10" aria-label={p.name} />

              <FavoriteButton
                itemKey={p.key}
                name={p.name}
                imageUrl={p.imageUrl}
                href={p.href}
                subtitle={p.subtitle}
                size={13}
                className="absolute top-1.5 end-1.5 w-7 h-7 z-20"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
