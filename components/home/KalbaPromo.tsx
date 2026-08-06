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

async function getKalbaStats() {
  const { data } = await supabaseAdmin
    .from("kalba_hero")
    .select("rating, rating_count, delivery_time, location, is_open")
    .limit(1)
    .single();
  return data;
}

export default async function KalbaPromo() {
  const [raw, stats] = await Promise.all([getPromo(), getKalbaStats()]);
  const promo: CampusPromo = raw ? { ...DEFAULTS, ...raw } : DEFAULTS;

  if (!promo.is_active) return null;

  const content: KalbaPromoContent = {
    title: promo.title,
    subtitle: promo.subtitle,
    description: promo.description,
    badge: promo.badge,
    image_url: promo.image_url,
    button_text: promo.button_text,
    perks: [promo.perk1, promo.perk2, promo.perk3].filter(Boolean),
    rating: stats?.rating ?? "4.6",
    ratingCount: stats?.rating_count ?? "500+",
    deliveryTime: stats?.delivery_time ?? "15–25 min",
    location: stats?.location ?? "Near University of Kalba",
    isOpen: stats?.is_open ?? true,
  };

  return <KalbaPromoClient promo={content} />;
}
