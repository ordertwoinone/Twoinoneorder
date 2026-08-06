import { supabaseAdmin } from "@/lib/supabase-admin";
import { stagger } from "@/lib/stagger";
import { T } from "@/lib/i18n/T";
import OfferSlideCard, { OfferItem } from "./OfferSlideCard";
import HomepageCard, { HomepageCardData } from "./HomepageCard";

interface HomepageCardRow extends HomepageCardData {
  sort_order: number;
  is_active: boolean;
}

/* The built-in three carry an `i18nPrefix`, so their copy comes from the
   dictionary. Cards added in the admin panel have none and show as typed. */
const FALLBACK: HomepageCardRow[] = [
  {
    id: "1", sort_order: 1, is_active: true,
    i18nPrefix: "home.cards.bookTable",
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
    i18nPrefix: "home.cards.catering",
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
    i18nPrefix: "home.cards.kalba",
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

async function getCards(): Promise<HomepageCardRow[]> {
  const { data, error } = await supabaseAdmin
    .from("homepage_cards")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data || data.length === 0) return FALLBACK;
  return data;
}

async function getOffers(): Promise<OfferItem[]> {
  const { data } = await supabaseAdmin
    .from("offers")
    .select("id, badge_text, badge_color, title, subtitle, cta_text, cta_href, image_url, card_color")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data || [];
}

export default async function HomepageCards() {
  const [cards, offers] = await Promise.all([getCards(), getOffers()]);
  if (cards.length === 0) return null;

  const hasOffers = offers.length > 0;

  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-4">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
            <T k="home.moreWaysTitle" />
          </h2>
        </div>

        <div className={`grid grid-cols-3 gap-2 sm:grid-cols-2 sm:gap-4 items-start ${hasOffers ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {cards.map((card, i) => (
            <HomepageCard
              key={card.id}
              card={card}
              // Booking already has its own action in the mobile bottom nav, so
              // the card is desktop-only.
              wrapperClass={`stagger-item ${card.href === "/book-table" ? "hidden sm:flex flex-col" : "flex flex-col"}`}
              wrapperStyle={{ animationDelay: `${stagger(i)}ms` }}
            />
          ))}

          {/* 4th position — rotating Special Offers slideshow */}
          {hasOffers && <OfferSlideCard items={offers} />}
        </div>

      </div>
    </section>
  );
}
