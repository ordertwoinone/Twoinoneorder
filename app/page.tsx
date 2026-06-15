import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import SearchBar from "@/components/home/SearchBar";
import HeroBanner from "@/components/home/HeroBanner";
import RestaurantCards from "@/components/home/RestaurantCards";
import HomepageCards from "@/components/home/HomepageCards";
import HomeCategories from "@/components/home/HomeCategories";
import TrustBadges from "@/components/home/TrustBadges";
import FadeInSection from "@/components/ui/FadeInSection";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { BannerSlide } from "@/components/home/HeroBanner";

async function getBanners(): Promise<BannerSlide[]> {
  const { data } = await supabaseAdmin
    .from("hero_banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data || [];
}

export default async function HomePage() {
  const banners = await getBanners();

  return (
    <>
      <Navbar />
      <main className="pb-20 sm:pb-0">
        <div className="sticky top-16 z-30 bg-white border-b border-gray-100">
          <SearchBar />
        </div>
        <HeroBanner slides={banners} />
        <FadeInSection><HomeCategories /></FadeInSection>
        <FadeInSection><RestaurantCards /></FadeInSection>
        <FadeInSection><HomepageCards /></FadeInSection>
        <FadeInSection><TrustBadges /></FadeInSection>
        <Footer />
      </main>
      <BottomNav />
      <WhatsAppButton />
    </>
  );
}
