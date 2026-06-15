import Image from "next/image";
import Link from "next/link";
import { Star, Tag } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import FavoriteButton from "@/components/ui/FavoriteButton";

interface Highlight {
  id: string;
  name: string;
  cuisine: string;
  price: number;
  rating: number;
  reviews: number;
  badge: string;
  badge_color: string;
  image_url: string;
  href: string;
}

async function getHighlights(): Promise<Highlight[]> {
  const { data } = await supabaseAdmin
    .from("buffet_highlights")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data || [];
}

export default async function BuffetHighlights() {
  const highlights = await getHighlights();
  if (highlights.length === 0) return null;

  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-4">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Buffet Highlights</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {highlights.map((b) => (
            <div key={b.id} className="group relative bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col">

              {/* Image — sits inside card with margin + own rounded corners */}
              <Link href={b.href} className="block mx-2 mt-2 rounded-[16px] overflow-hidden flex-shrink-0">
                <div className="relative w-full" style={{ height: "160px" }}>
                  {b.image_url ? (
                    <Image
                      src={b.image_url}
                      alt={b.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center text-5xl">
                      🍽️
                    </div>
                  )}

                  {/* Badge on image */}
                  {b.badge && (
                    <span
                      className="absolute top-2 left-2 text-[10px] font-bold px-2.5 py-1 rounded-full text-white leading-none"
                      style={{ background: b.badge_color || "#ea580c" }}
                    >
                      {b.badge}
                    </span>
                  )}
                </div>
              </Link>

              {/* Content */}
              <div className="px-3 pt-3 pb-3 sm:px-4 sm:pb-4 flex flex-col flex-1 gap-2">

                {/* Name + cuisine */}
                <Link href={b.href} className="block">
                  <h3 className="font-bold text-gray-900 text-[14px] sm:text-[17px] leading-tight">
                    {b.name}
                  </h3>
                  <p className="text-gray-400 text-[11px] sm:text-[13px] mt-0.5">{b.cuisine}</p>
                </Link>

                {/* Stats chips */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="flex items-center gap-1 text-[11px] sm:text-[13px] text-gray-600 font-medium">
                    <Tag size={11} className="text-gray-400" />
                    <span>from <strong className="text-gray-900">AED {b.price}</strong></span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] sm:text-[13px] text-gray-600 font-medium">
                    <Star size={11} className="fill-amber-400 stroke-amber-400" />
                    <strong className="text-gray-900">{b.rating}</strong>
                    <span className="text-gray-400">({b.reviews}+)</span>
                  </span>
                </div>

                {/* CTA row — dark pill button + heart */}
                <div className="flex items-center gap-2 mt-auto">
                  <Link
                    href={b.href}
                    className="flex-1 text-center bg-gray-900 hover:bg-gray-800 text-white text-[11px] sm:text-[13px] font-bold py-2.5 rounded-full transition-colors duration-200"
                  >
                    Book Now
                  </Link>
                  <FavoriteButton
                    itemKey={`buffet:${b.id}`}
                    name={b.name}
                    imageUrl={b.image_url}
                    href={b.href}
                    subtitle={b.cuisine}
                    size={15}
                    className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 !border-gray-200"
                  />
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
