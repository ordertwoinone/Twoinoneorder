import { supabaseAdmin } from "@/lib/supabase-admin";
import { stagger } from "@/lib/stagger";
import { T } from "@/lib/i18n/T";
import CategoryTile from "./CategoryTile";

interface HomeCategory {
  id: string;
  name: string;
  emoji: string;
  image_url: string;
  href: string;
  sort_order: number;
  is_active: boolean;
}

const u = (id: string) =>
  `https://images.unsplash.com/${id}?w=200&h=200&q=80&auto=format&fit=crop`;

// Restaurant websites — each cuisine links to the restaurant that serves it
const FALAFEL = "https://order.falafelalnile.com";
const KARAK   = "https://www.karaksnack.com";
const MINIBOX = "https://www.miniboxae.com";
const TWOINONE = "https://order.twoinoneae.com";

const FALLBACK: HomeCategory[] = [
  { id: "1",  name: "Arabic",   emoji: "🫓", image_url: u("photo-1607532941433-304659e8198a"), href: FALAFEL,  sort_order: 1,  is_active: true },
  { id: "2",  name: "Indian",   emoji: "🍛", image_url: u("photo-1585937421612-70a008356fbe"), href: KARAK,    sort_order: 2,  is_active: true },
  { id: "3",  name: "Chinese",  emoji: "🥡", image_url: u("photo-1563245372-f21724e3856d"),   href: TWOINONE, sort_order: 3,  is_active: true },
  { id: "4",  name: "Egyptian", emoji: "🧆", image_url: u("photo-1574484284002-952d92a03a05"), href: FALAFEL,  sort_order: 4,  is_active: true },
  { id: "5",  name: "Grilled",  emoji: "🥩", image_url: u("photo-1529193591184-b1d58069ecdd"), href: FALAFEL,  sort_order: 5,  is_active: true },
  { id: "6",  name: "Sandwich", emoji: "🥪", image_url: u("photo-1553979459-d2229ba7433b"),   href: MINIBOX,  sort_order: 6,  is_active: true },
  { id: "7",  name: "Pizza",    emoji: "🍕", image_url: u("photo-1565299624946-b28f40a0ae38"), href: MINIBOX,  sort_order: 7,  is_active: true },
  { id: "8",  name: "Salads",   emoji: "🥗", image_url: u("photo-1512621776951-a57141f2eefd"), href: MINIBOX,  sort_order: 8,  is_active: true },
  { id: "9",  name: "Drinks",   emoji: "☕", image_url: u("photo-1495474472287-4d71bcdd2085"), href: TWOINONE, sort_order: 9,  is_active: true },
  { id: "10", name: "Desserts", emoji: "🍰", image_url: u("photo-1565958011703-44f9829ba187"), href: MINIBOX,  sort_order: 10, is_active: true },
];

async function getCategories(platform: "mobile" | "web"): Promise<HomeCategory[]> {
  const { data, error } = await supabaseAdmin
    .from("home_categories")
    .select("*")
    .eq("is_active", true)
    .eq("platform", platform)
    .order("sort_order", { ascending: true });
  if (error || !data || data.length === 0) return FALLBACK;
  return data;
}

/** Shape CategoryTile expects, with the image fallback already resolved. */
function toTile(cat: HomeCategory) {
  return {
    name: cat.name,
    imageUrl:
      cat.image_url || FALLBACK.find((f) => f.name === cat.name)?.image_url || FALLBACK[0].image_url,
    href: cat.href,
  };
}

export default async function HomeCategories({ variant = "mobile" }: { variant?: "mobile" | "web" }) {
  const categories = await getCategories(variant);
  if (categories.length === 0) return null;

  // ── Web: heading + even grid filling the width (classic 1da5a55 layout) ──
  if (variant === "web") {
    return (
      <section className="py-5">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xl font-extrabold text-gray-900 mb-4">
            <T k="home.categoriesTitle" />
          </h2>
          {/* Columns are capped at 110px (rather than 1fr) so a short list
              stays grouped under the heading instead of spreading across the
              full container width; they shrink below that on narrow screens. */}
          <div
            className="grid [grid-template-columns:repeat(var(--cat-cols),minmax(0,110px))] justify-items-center gap-4 sm:gap-5"
            style={{ ["--cat-cols" as string]: Math.min(categories.length, 10) }}
          >
            {categories.map((cat, i) => (
              <CategoryTile
                key={cat.id}
                cat={toTile(cat)}
                itemClass="stagger-item flex flex-col items-center gap-2 group w-full tap-shrink"
                style={{ animationDelay: `${stagger(i, 40)}ms` }}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ── Mobile: fixed-size items in a horizontal swipe scroll ──
  return (
    <section className="pt-4 pb-2">
      <div className="max-w-7xl mx-auto">
        {/* scroll-ps-4 matches the px-4 inset: without it, snapping aligns the
            first tile to the container edge and scrolls the left padding out of
            view, so the row starts tighter than the other sections. */}
        <div className="flex gap-2.5 overflow-x-auto scrollbar-none momentum-x px-4 scroll-ps-4">
          {/* This row sits above the fold, so the tiles pop in on load rather
              than waiting for a scroll that has already happened. */}
          {categories.map((cat, i) => (
            <CategoryTile
              key={cat.id}
              cat={toTile(cat)}
              itemClass="pop-in flex flex-col items-center gap-1.5 group w-[64px] shrink-0 snap-item tap-shrink"
              style={{ animationDelay: `${stagger(i, 45)}ms` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
