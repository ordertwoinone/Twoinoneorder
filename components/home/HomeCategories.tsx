import Image from "next/image";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

function CategoryItem({ cat, itemClass }: { cat: HomeCategory; itemClass: string }) {
  const imgSrc =
    cat.image_url || FALLBACK.find((f) => f.name === cat.name)?.image_url || FALLBACK[0].image_url;
  const isExternal = cat.href?.startsWith("http");

  const inner = (
    <>
      <div
        className={`relative w-full aspect-square rounded-2xl overflow-hidden shadow-sm ring-2 ring-transparent transition-all duration-200 ${
          cat.href ? "group-hover:ring-orange-400 group-hover:shadow-md group-hover:scale-[1.05] cursor-pointer" : ""
        }`}
      >
        <Image src={imgSrc} alt={cat.name} fill className="object-cover" sizes="(max-width: 768px) 20vw, 10vw" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      <p
        className={`text-[10px] sm:text-[11px] font-bold text-center leading-tight transition-colors ${
          cat.href ? "text-gray-700 group-hover:text-orange-600" : "text-gray-500"
        }`}
      >
        {cat.name}
      </p>
    </>
  );

  if (!cat.href) return <div className={`${itemClass} cursor-default`}>{inner}</div>;
  return isExternal ? (
    <a href={cat.href} className={itemClass}>{inner}</a>
  ) : (
    <Link href={cat.href} className={itemClass}>{inner}</Link>
  );
}

export default async function HomeCategories({ variant = "mobile" }: { variant?: "mobile" | "web" }) {
  const categories = await getCategories(variant);
  if (categories.length === 0) return null;

  // ── Web: heading + even grid filling the width (classic 1da5a55 layout) ──
  if (variant === "web") {
    return (
      <section className="py-5">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xl font-extrabold text-gray-900 mb-4">What are you craving?</h2>
          <div
            className="grid [grid-template-columns:repeat(var(--cat-cols),minmax(0,1fr))] justify-items-center gap-4"
            style={{ ["--cat-cols" as string]: Math.min(categories.length, 10) }}
          >
            {categories.map((cat) => (
              <CategoryItem
                key={cat.id}
                cat={cat}
                itemClass="flex flex-col items-center gap-2 group w-full max-w-[96px] tap-shrink"
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
        <div className="flex gap-2.5 overflow-x-auto scrollbar-none momentum-x pl-6 pr-4">
          {categories.map((cat) => (
            <CategoryItem
              key={cat.id}
              cat={cat}
              itemClass="flex flex-col items-center gap-1.5 group w-[64px] shrink-0 snap-item tap-shrink"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
