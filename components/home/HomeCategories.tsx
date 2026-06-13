import Image from "next/image";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface HomeCategory {
  id: string;
  name: string;
  emoji: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

const u = (id: string) =>
  `https://images.unsplash.com/${id}?w=200&h=200&q=80&auto=format&fit=crop`;

const FALLBACK: HomeCategory[] = [
  { id: "1",  name: "Arabic",   emoji: "🫓", image_url: u("photo-1607532941433-304659e8198a"), sort_order: 1,  is_active: true },
  { id: "2",  name: "Indian",   emoji: "🍛", image_url: u("photo-1585937421612-70a008356fbe"), sort_order: 2,  is_active: true },
  { id: "3",  name: "Chinese",  emoji: "🥡", image_url: u("photo-1563245372-f21724e3856d"),   sort_order: 3,  is_active: true },
  { id: "4",  name: "Egyptian", emoji: "🧆", image_url: u("photo-1574484284002-952d92a03a05"), sort_order: 4,  is_active: true },
  { id: "5",  name: "Grilled",  emoji: "🥩", image_url: u("photo-1529193591184-b1d58069ecdd"), sort_order: 5,  is_active: true },
  { id: "6",  name: "Sandwich", emoji: "🥪", image_url: u("photo-1553979459-d2229ba7433b"),   sort_order: 6,  is_active: true },
  { id: "7",  name: "Pizza",    emoji: "🍕", image_url: u("photo-1565299624946-b28f40a0ae38"), sort_order: 7,  is_active: true },
  { id: "8",  name: "Salads",   emoji: "🥗", image_url: u("photo-1512621776951-a57141f2eefd"), sort_order: 8,  is_active: true },
  { id: "9",  name: "Drinks",   emoji: "☕", image_url: u("photo-1495474472287-4d71bcdd2085"), sort_order: 9,  is_active: true },
  { id: "10", name: "Desserts", emoji: "🍰", image_url: u("photo-1565958011703-44f9829ba187"), sort_order: 10, is_active: true },
];

async function getCategories(): Promise<HomeCategory[]> {
  const { data, error } = await supabaseAdmin
    .from("home_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data || data.length === 0) return FALLBACK;
  return data;
}

export default async function HomeCategories() {
  const categories = await getCategories();
  if (categories.length === 0) return null;

  return (
    <section className="py-5 px-4">
      <div className="max-w-7xl mx-auto">

        <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-4">
          What are you craving?
        </h2>

        {/* 5 per row on mobile → 10 per row on md+ — always fills full width */}
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2 sm:gap-3">
          {categories.map((cat) => {
            const imgSrc = cat.image_url
              || FALLBACK.find((f) => f.name === cat.name)?.image_url
              || FALLBACK[0].image_url;

            return (
              <div
                key={cat.id}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                {/* Square image with rounded corners */}
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-sm ring-2 ring-transparent group-hover:ring-orange-400 group-hover:shadow-md transition-all duration-200 group-hover:scale-[1.05]">
                  <Image
                    src={imgSrc}
                    alt={cat.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 20vw, 10vw"
                  />
                  {/* Bottom gradient for depth */}
                  <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/40 to-transparent" />
                </div>

                {/* Name */}
                <p className="text-[10px] sm:text-[11px] font-bold text-gray-700 text-center leading-tight group-hover:text-orange-600 transition-colors">
                  {cat.name}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
      </div>
    </section>
  );
}
