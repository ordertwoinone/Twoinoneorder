import Image from "next/image";
import { Plus } from "lucide-react";
import FavoriteButton from "@/components/ui/FavoriteButton";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stagger } from "@/lib/stagger";

/** Normalised shape every source table is mapped into. */
interface Pick {
  key: string;
  name: string;
  price: string | null;
  imageUrl: string;
  href: string;
  subtitle: string;
  order: number;
  sortOrder: number;
}

/** "12" / 12 / "AED 12" → "AED 12.00"; free text is passed through as-is. */
function formatPrice(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const text = String(raw).trim();
  const n = parseFloat(text.replace(/aed/i, "").replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return /\d/.test(text) ? text : null;
  return `AED ${n.toFixed(2)}`;
}

/** An embedded to-one relation comes back as an object, or an array in some shapes. */
function restaurantName(relation: unknown): string | null {
  const row = Array.isArray(relation) ? relation[0] : relation;
  const name = (row as { name?: unknown } | null)?.name;
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
      .select("id, name, image_url, price, sort_order, top_picks_order")
      .eq("is_active", true)
      .eq("show_in_top_picks", true),
    supabaseAdmin
      .from("buffet_popular_dishes")
      .select("id, name, image_url, tag, sort_order, top_picks_order")
      .eq("is_active", true)
      .eq("show_in_top_picks", true),
    supabaseAdmin
      .from("kalba_popular_items")
      .select("id, name, image_url, price, sort_order, top_picks_order")
      .eq("is_active", true)
      .eq("show_in_top_picks", true),
    supabaseAdmin
      .from("kalba_specials")
      .select("id, name, image_url, price_text, sort_order, top_picks_order")
      .eq("is_active", true)
      .eq("show_in_top_picks", true),
    // Items imported from the restaurants' ordering storefronts. These are the
    // only source with a real per-item order link.
    supabaseAdmin
      .from("restaurant_menu_items")
      .select("id, name, image_url, price, product_url, top_picks_order, restaurants(name)")
      .eq("is_available", true)
      .eq("show_in_top_picks", true),
  ]);

  const picks: Pick[] = [
    ...(menuItems.data ?? []).map((r) => ({
      key: `buffetmenu:${r.id}`,
      name: r.name,
      price: formatPrice(r.price),
      imageUrl: r.image_url,
      href: "/restaurant/buffet",
      subtitle: "Buffet menu",
      order: r.top_picks_order ?? 0,
      sortOrder: r.sort_order ?? 0,
    })),
    ...(buffetDishes.data ?? []).map((r) => ({
      key: `buffetdish:${r.id}`,
      name: r.name,
      price: null,
      imageUrl: r.image_url,
      href: "/restaurant/buffet",
      subtitle: r.tag || "Buffet dish",
      order: r.top_picks_order ?? 0,
      sortOrder: r.sort_order ?? 0,
    })),
    ...(kalbaPopular.data ?? []).map((r) => ({
      key: `kalbapopular:${r.id}`,
      name: r.name,
      price: formatPrice(r.price),
      imageUrl: r.image_url,
      href: "/restaurant/university-kalba",
      subtitle: "University Kalba",
      order: r.top_picks_order ?? 0,
      sortOrder: r.sort_order ?? 0,
    })),
    ...(kalbaSpecials.data ?? []).map((r) => ({
      key: `kalbaspecial:${r.id}`,
      name: r.name,
      price: formatPrice(r.price_text),
      imageUrl: r.image_url,
      href: "/restaurant/university-kalba",
      subtitle: "University Kalba",
      order: r.top_picks_order ?? 0,
      sortOrder: r.sort_order ?? 0,
    })),
    ...(imported.data ?? []).map((r) => ({
      key: `menuitem:${r.id}`,
      name: r.name,
      price: formatPrice(r.price),
      imageUrl: r.image_url,
      // Straight to the item on the restaurant's own ordering site.
      href: r.product_url || "#",
      subtitle: restaurantName(r.restaurants) ?? "Order now",
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
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Top Picks For You</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Handpicked favourites from our kitchens</p>
        </div>

        {/* Mobile: horizontal swipe strip. Desktop: even grid. */}
        {/* Mobile: two rows that scroll sideways — grid-flow-col fills top to
            bottom, then moves to the next column, with each column sized so
            three sit in view. scroll-pl-4 matches the px-4 inset (see
            HomeCategories: snapping otherwise pulls the first card flush to the
            screen edge). sm+: a plain single-row grid. */}
        <div className="grid grid-flow-col grid-rows-2 auto-cols-[calc((100vw-3.5rem)/3)] gap-3 overflow-x-auto scrollbar-none momentum-x px-4 scroll-pl-4 sm:grid-flow-row sm:grid-rows-none sm:auto-cols-auto sm:grid-cols-4 lg:grid-cols-5 sm:gap-4 sm:overflow-visible">
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
                  {p.name}
                </h3>
                <div className="flex items-center justify-between gap-1 mt-1.5">
                  <span className="text-[11px] sm:text-[12px] font-extrabold truncate" style={{ color: "#ea580c" }}>
                    {p.price ?? p.subtitle}
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
                className="absolute top-1.5 right-1.5 w-7 h-7 z-20"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
