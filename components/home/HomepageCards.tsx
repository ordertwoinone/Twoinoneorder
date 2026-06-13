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
    subtitle: "Dine In",
    description: "Reserve your table online in seconds and skip the wait.",
    emoji: "🪑", image_url: "",
    badge: "🍽️ Available Now",
    button_text: "Book Now",
    href: "/book-table",
    accent_color: "#16a34a",
    bg_from: "#f0fdf4",
    bg_to: "#dcfce7",
  },
  {
    id: "2", sort_order: 2, is_active: true,
    title: "Catering Services",
    subtitle: "Events",
    description: "Corporate lunches to family celebrations — we handle the food.",
    emoji: "🥘", image_url: "",
    badge: "🎪 Custom Menu",
    button_text: "Get a Quote",
    href: "/catering",
    accent_color: "#7c3aed",
    bg_from: "#faf5ff",
    bg_to: "#ede9fe",
  },
  {
    id: "3", sort_order: 3, is_active: true,
    title: "University Kalba",
    subtitle: "On Campus",
    description: "Student prices, free WiFi, open late and daily campus deals.",
    emoji: "🎓", image_url: "",
    badge: "🎓 Students",
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

            const cardEl = (
              <div className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 overflow-hidden flex flex-col h-full">

                {/* Image / Emoji — sits inside with margin, its own rounded corners */}
                <div className="mx-3 mt-3 rounded-2xl overflow-hidden flex-shrink-0">
                  <div
                    className="relative w-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${card.bg_from} 0%, ${card.bg_to} 100%)`,
                      minHeight: "160px",
                    }}
                  >
                    {card.image_url ? (
                      <Image
                        src={card.image_url}
                        alt={card.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 90vw, 30vw"
                      />
                    ) : (
                      <span className="text-7xl select-none py-6 drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
                        {card.emoji}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="px-4 pt-3 pb-4 flex flex-col flex-1 gap-1.5">

                  {/* Title + badge chip */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-gray-900 text-base leading-tight">
                      {card.title}
                    </h3>
                    {card.badge && (
                      <span
                        className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full text-white leading-none"
                        style={{ background: card.accent_color }}
                      >
                        {card.badge}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {card.description && (
                    <p className="text-gray-400 text-[12px] sm:text-[13px] leading-relaxed">
                      {card.description}
                    </p>
                  )}

                  {/* Bottom row — subtitle chip + CTA */}
                  <div className="flex items-center gap-2 mt-auto pt-3">
                    {card.subtitle && (
                      <span className="flex items-center gap-1 text-[12px] text-gray-500 font-medium bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                        {card.subtitle}
                      </span>
                    )}

                    <div
                      className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-200 group-hover:gap-2.5"
                      style={{
                        background: `${card.accent_color}15`,
                        color: card.accent_color,
                      }}
                    >
                      {card.button_text}
                      <ArrowRight size={13} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                    </div>
                  </div>

                </div>
              </div>
            );

            return isExternal ? (
              <a key={card.id} href={card.href} target="_blank" rel="noopener noreferrer" className="flex flex-col">
                {cardEl}
              </a>
            ) : (
              <Link key={card.id} href={card.href} className="flex flex-col">
                {cardEl}
              </Link>
            );
          })}
        </div>

      </div>
    </section>
  );
}
