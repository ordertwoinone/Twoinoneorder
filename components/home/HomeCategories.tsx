import { supabaseAdmin } from "@/lib/supabase-admin";

interface HomeCategory {
  id: string;
  name: string;
  emoji: string;
  sort_order: number;
  is_active: boolean;
}

async function getCategories(): Promise<HomeCategory[]> {
  const { data } = await supabaseAdmin
    .from("home_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

// Rotating gradient backgrounds for visual variety
const GRADIENTS = [
  "from-orange-50 to-amber-100",
  "from-rose-50 to-orange-100",
  "from-amber-50 to-yellow-100",
  "from-orange-100 to-red-100",
  "from-yellow-50 to-orange-100",
  "from-red-50 to-rose-100",
];

export default async function HomeCategories() {
  const categories = await getCategories();
  if (categories.length === 0) return null;

  return (
    <section className="py-4 px-4">
      <div className="max-w-7xl mx-auto">

        <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-4">
          What are you craving?
        </h2>

        {/* Scrollable row on mobile, wrapped grid on desktop */}
        <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(80px,1fr))] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((cat, i) => {
            const gradient = GRADIENTS[i % GRADIENTS.length];
            return (
              <div
                key={cat.id}
                className="shrink-0 flex flex-col items-center gap-2 group cursor-pointer"
              >
                {/* Circle */}
                <div
                  className={`
                    w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-full
                    bg-gradient-to-br ${gradient}
                    flex items-center justify-center
                    text-3xl sm:text-4xl
                    border-2 border-white shadow-sm
                    group-hover:scale-110 group-hover:shadow-md group-hover:border-orange-200
                    transition-all duration-200
                  `}
                >
                  {cat.emoji}
                </div>

                {/* Name */}
                <p className="text-[11px] sm:text-xs font-bold text-gray-700 text-center leading-tight w-[72px] sm:w-20 group-hover:text-orange-600 transition-colors">
                  {cat.name}
                </p>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mt-5 h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
      </div>
    </section>
  );
}
