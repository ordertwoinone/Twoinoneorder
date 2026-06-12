import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import { supabaseAdmin } from "@/lib/supabase-admin";
import KalbaContent from "./KalbaContent";
import type {
  KalbaHero,
  KalbaBanner,
  KalbaCategory,
  KalbaPopularItem,
  KalbaStudy,
  KalbaDailyDeal,
  KalbaSpecial,
} from "./KalbaContent";

export const revalidate = 60;

const img = (id: string, w = 600) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

const DEFAULT_HERO: KalbaHero = {
  name: "Two in One University Kalba",
  location: "Near University of Kalba, Kalba",
  maps_url: "https://www.google.com/maps/search/?api=1&query=University+City+Kalba+Sharjah",
  whatsapp: "971522305216",
  rating: "4.6",
  rating_count: "500+",
  delivery_time: "15–25 min",
  delivery_fee: "Free delivery",
  is_open: true,
  closes_at: "12:00 AM",
  student_title: "Are you a student?",
  student_subtitle: "Unlock exclusive student deals & discounts",
  student_button: "Verify Student",
};

const DEFAULT_BANNER: KalbaBanner = {
  title: "Made for Students,",
  title_highlight: "Loved by Everyone!",
  subtitle: "Great food. Better prices. Right on campus.",
  image_url: img("photo-1504754524776-8f4f37790ca0", 1200),
  chips: [
    { emoji: "🎓", line1: "Student Friendly", line2: "Pricing" },
    { emoji: "☕", line1: "Breakfast from", line2: "AED 5" },
    { emoji: "🍔", line1: "Lunch Combos from", line2: "AED 12" },
    { emoji: "📶", line1: "Free", line2: "WiFi" },
  ],
};

const DEFAULT_STUDY: KalbaStudy = {
  title: "Study & Chill",
  subtitle: "The perfect place to eat, study and hangout.",
  image_url: img("photo-1521017432531-fbd92d768814", 1200),
  button_text: "Visit Store",
  features: [
    { icon: "Wifi", label: "Free WiFi" },
    { icon: "BatteryCharging", label: "Charging Points" },
    { icon: "Armchair", label: "Indoor Seating" },
    { icon: "Users", label: "Group Tables" },
    { icon: "MoonStar", label: "Open Late" },
  ],
};

async function getKalbaData() {
  const [heroRes, bannerRes, catsRes, popularRes, studyRes, dealsRes, specialsRes] =
    await Promise.all([
      supabaseAdmin.from("kalba_hero").select("*").limit(1).single(),
      supabaseAdmin.from("kalba_banner").select("*").limit(1).single(),
      supabaseAdmin.from("kalba_categories").select("*").eq("is_active", true).order("sort_order"),
      supabaseAdmin.from("kalba_popular_items").select("*").eq("is_active", true).order("sort_order"),
      supabaseAdmin.from("kalba_study").select("*").limit(1).single(),
      supabaseAdmin.from("kalba_daily_deals").select("*").eq("is_active", true).order("sort_order"),
      supabaseAdmin.from("kalba_specials").select("*").eq("is_active", true).order("sort_order"),
    ]);

  const banner = bannerRes.data ?? DEFAULT_BANNER;
  const study = studyRes.data ?? DEFAULT_STUDY;

  return {
    hero: (heroRes.data ?? DEFAULT_HERO) as KalbaHero,
    banner: { ...banner, chips: Array.isArray(banner.chips) ? banner.chips : [] } as KalbaBanner,
    categories: (catsRes.data ?? []) as KalbaCategory[],
    popular: (popularRes.data ?? []) as KalbaPopularItem[],
    study: { ...study, features: Array.isArray(study.features) ? study.features : [] } as KalbaStudy,
    deals: (dealsRes.data ?? []) as KalbaDailyDeal[],
    specials: (specialsRes.data ?? []) as KalbaSpecial[],
  };
}

export const metadata: Metadata = {
  title: "Two in One University Kalba — Made for Students, Loved by Everyone",
  description:
    "Two in One near University of Kalba. Student-friendly prices, breakfast from AED 5, lunch combos, free WiFi and daily deals. Open 7 AM – 12 AM.",
};

export default async function UniversityKalbaPage() {
  const data = await getKalbaData();

  return (
    <>
      <Navbar />
      <main className="bg-white pb-24 sm:pb-0">
        <KalbaContent {...data} />
      </main>
      <Footer />
      <BottomNav />
      <WhatsAppButton />
    </>
  );
}
