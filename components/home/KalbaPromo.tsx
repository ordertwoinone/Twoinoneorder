import { supabaseAdmin } from "@/lib/supabase-admin";
import KalbaPromoClient, { KalbaPromoContent } from "./KalbaPromoClient";

interface CampusPromo {
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  image_url: string;
  button_text: string;
  perk1: string;
  perk2: string;
  perk3: string;
  is_active: boolean;
  /* Arabic twins from admin → Campus Promo; blank falls back to English. */
  title_ar?: string | null;
  subtitle_ar?: string | null;
  description_ar?: string | null;
  badge_ar?: string | null;
  button_text_ar?: string | null;
  perk1_ar?: string | null;
  perk2_ar?: string | null;
  perk3_ar?: string | null;
}

const DEFAULTS: CampusPromo = {
  title: "Two in One University Kalba",
  subtitle: "Made for Students, Loved by Everyone!",
  description: "Student-friendly prices · Fresh food · Free WiFi",
  badge: "🎓 On Campus",
  image_url: "",
  button_text: "View Menu",
  perk1: "Student Prices",
  perk2: "Free WiFi",
  perk3: "Open Late",
  is_active: true,
};

async function getPromo(): Promise<CampusPromo | null> {
  const { data } = await supabaseAdmin
    .from("campus_promo")
    .select("*")
    .limit(1)
    .single();
  return data ?? null;
}

/* `*` so the Arabic twins of the stats come through too — the column list this
   used to name left the branch info reading English in an Arabic page. */
async function getKalbaStats() {
  const { data } = await supabaseAdmin
    .from("kalba_hero")
    .select("*")
    .limit(1)
    .single();
  return data;
}

export default async function KalbaPromo() {
  const [raw, stats] = await Promise.all([getPromo(), getKalbaStats()]);
  const promo: CampusPromo = raw ? { ...DEFAULTS, ...raw } : DEFAULTS;

  if (!promo.is_active) return null;

  /* Perks travel as pairs so the client can pick a language per chip. */
  const perks = ([
    [promo.perk1, promo.perk1_ar],
    [promo.perk2, promo.perk2_ar],
    [promo.perk3, promo.perk3_ar],
  ] as const)
    .filter(([en]) => Boolean(en))
    .map(([en, ar]) => ({ en, ar: ar ?? null }));

  const content: KalbaPromoContent = {
    title: promo.title,
    titleAr: promo.title_ar ?? null,
    subtitle: promo.subtitle,
    subtitleAr: promo.subtitle_ar ?? null,
    description: promo.description,
    descriptionAr: promo.description_ar ?? null,
    badge: promo.badge,
    badgeAr: promo.badge_ar ?? null,
    image_url: promo.image_url,
    button_text: promo.button_text,
    buttonTextAr: promo.button_text_ar ?? null,
    perks,
    rating: stats?.rating ?? "4.6",
    ratingCount: stats?.rating_count ?? "500+",
    ratingCountAr: stats?.rating_count_ar ?? null,
    deliveryTime: stats?.delivery_time ?? "15–25 min",
    deliveryTimeAr: stats?.delivery_time_ar ?? null,
    location: stats?.location ?? "Near University of Kalba",
    locationAr: stats?.location_ar ?? null,
    isOpen: stats?.is_open ?? true,
  };

  return <KalbaPromoClient promo={content} />;
}
