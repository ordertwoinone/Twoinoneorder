import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface Offer {
  id: string;
  badge_text: string;
  badge_color: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_href: string;
  image_url: string;
  bg_color: string;
}

async function getOffers(): Promise<Offer[]> {
  const { data, error } = await supabaseAdmin
    .from("offers")
    .select("id, badge_text, badge_color, title, subtitle, cta_text, cta_href, image_url, bg_color")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return [];
  return data;
}

export default async function OffersBanner() {
  const offers = await getOffers();

  if (!offers.length) return null;

  return (
    <section id="offers" className="py-4">
      <div className="max-w-7xl mx-auto px-4">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Special Offers</h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {offers.map((offer) => (
            <a
              key={offer.id}
              href={offer.cta_href || "#"}
              className="relative flex rounded-2xl overflow-hidden border border-gray-100 transition-shadow hover:shadow-lg group"
              style={{
                background: offer.bg_color || "#ffffff",
                minHeight: "140px",
                boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
              }}
            >
              {/* LEFT: text */}
              <div className="flex flex-col justify-between p-5 flex-1 z-10 pr-2">
                {/* Badge pill */}
                {offer.badge_text && (
                  <span
                    className="inline-block text-white text-[11px] font-bold px-3 py-1 rounded-full mb-2 w-fit"
                    style={{ background: offer.badge_color || "#ea580c" }}
                  >
                    {offer.badge_text}
                  </span>
                )}

                {/* Title */}
                <h3 className="text-gray-900 font-extrabold text-base leading-tight mb-1">
                  {offer.title}
                </h3>

                {/* Subtitle */}
                {offer.subtitle && (
                  <p className="text-gray-400 text-[11px] leading-relaxed mb-3 line-clamp-2">
                    {offer.subtitle}
                  </p>
                )}

                {/* CTA */}
                <div
                  className="inline-flex items-center gap-1.5 self-start px-4 py-1.5 rounded-full text-white text-[12px] font-bold transition-all group-hover:gap-2.5"
                  style={{ background: "#ea580c" }}
                >
                  {offer.cta_text || "Order Now"}
                  <ArrowRight size={12} />
                </div>
              </div>

              {/* RIGHT: image */}
              {offer.image_url && (
                <div className="relative w-[42%] shrink-0">
                  <Image
                    src={offer.image_url}
                    alt={offer.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 45vw, 15vw"
                  />
                  {/* Gradient blend */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to right, ${offer.bg_color || "#fff"} 0%, ${offer.bg_color || "#fff"}88 15%, transparent 50%)`,
                    }}
                  />
                </div>
              )}
            </a>
          ))}
        </div>

      </div>
    </section>
  );
}
