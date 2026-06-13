import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface HomepageCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  emoji: string;
  image_url: string;
  badge: string;
  button_text: string;
  href: string;
  accent_color: string;
  bg_from: string;
  bg_to: string;
  sort_order: number;
  is_active: boolean;
}

const FALLBACK: HomepageCard[] = [
  {
    id: "1", sort_order: 1, is_active: true,
    title: "Book a Table",
    subtitle: "Reserve Your Spot",
    description: "Dine in comfort. Reserve your table online in seconds and skip the wait.",
    emoji: "🪑", image_url: "",
    badge: "🍽️ Dine In",
    button_text: "Book Now",
    href: "/book-table",
    accent_color: "#16a34a",
    bg_from: "#f0fdf4",
    bg_to: "#dcfce7",
  },
  {
    id: "2", sort_order: 2, is_active: true,
    title: "Catering Services",
    subtitle: "Events & Gatherings",
    description: "From corporate lunches to family celebrations — we handle the food.",
    emoji: "🥘", image_url: "",
    badge: "🎪 Catering",
    button_text: "Get a Quote",
    href: "/catering",
    accent_color: "#7c3aed",
    bg_from: "#faf5ff",
    bg_to: "#ede9fe",
  },
  {
    id: "3", sort_order: 3, is_active: true,
    title: "University Kalba",
    subtitle: "Made for Students",
    description: "Student-friendly prices, free WiFi, open late and daily campus deals.",
    emoji: "🎓", image_url: "",
    badge: "🎓 On Campus",
    button_text: "View Menu",
    href: "/restaurant/university-kalba",
    accent_color: "#ea580c",
    bg_from: "#fff8f2",
    bg_to: "#fdeedd",
  },
];

async function getCards(): Promise<HomepageCard[]> {
  const { data, error } = await supabaseAdmin
    .from("homepage_cards")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data || data.length === 0) return FALLBACK;
  return data;
}

export default async function HomepageCards() {
  const cards = await getCards();
  if (cards.length === 0) return null;

  return (
    <section className="py-4 px-4">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
            Now Open on Campus
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {cards.map((card) => {
            const isExternal = card.href?.startsWith("http");
            const cardContent = (
              <div
                className="group relative rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
                style={{ background: "#fff" }}
              >
                {/* Top gradient area */}
                <div
                  className="relative flex flex-col items-center justify-center px-6 pt-7 pb-5"
                  style={{
                    background: `linear-gradient(135deg, ${card.bg_from} 0%, ${card.bg_to} 100%)`,
                  }}
                >
                  {/* Badge */}
                  {card.badge && (
                    <span
                      className="absolute top-3 left-3 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full text-white"
                      style={{ background: card.accent_color }}
                    >
                      {card.badge}
                    </span>
                  )}

                  {/* Image or Emoji */}
                  {card.image_url ? (
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-md">
                      <Image
                        src={card.image_url}
                        alt={card.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 96px, 112px"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-5xl sm:text-6xl shadow-sm border-4 border-white"
                      style={{ background: `${card.accent_color}15` }}
                    >
                      {card.emoji}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 px-5 py-4">
                  {/* Subtitle */}
                  {card.subtitle && (
                    <p
                      className="text-[11px] font-extrabold uppercase tracking-wider mb-1"
                      style={{ color: card.accent_color }}
                    >
                      {card.subtitle}
                    </p>
                  )}

                  {/* Title */}
                  <h3 className="text-gray-900 font-extrabold text-base sm:text-lg leading-tight mb-2">
                    {card.title}
                  </h3>

                  {/* Description */}
                  {card.description && (
                    <p className="text-gray-500 text-[12px] sm:text-[13px] leading-relaxed flex-1 mb-4">
                      {card.description}
                    </p>
                  )}

                  {/* CTA */}
                  <div
                    className="mt-auto flex items-center justify-between px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-opacity hover:opacity-90"
                    style={{ background: card.accent_color }}
                  >
                    <span>{card.button_text}</span>
                    <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );

            if (isExternal) {
              return (
                <a key={card.id} href={card.href} target="_blank" rel="noopener noreferrer" className="flex flex-col">
                  {cardContent}
                </a>
              );
            }
            return (
              <Link key={card.id} href={card.href} className="flex flex-col">
                {cardContent}
              </Link>
            );
          })}
        </div>

      </div>
    </section>
  );
}
