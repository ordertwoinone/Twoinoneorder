import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import SpinWheel from "@/components/home/SpinWheel";
import SearchBar from "@/components/home/SearchBar";
import HeroBanner from "@/components/home/HeroBanner";
import RestaurantCards from "@/components/home/RestaurantCards";
import HomepageCards from "@/components/home/HomepageCards";
import HomeCategories from "@/components/home/HomeCategories";
import TrustBadges from "@/components/home/TrustBadges";
import FadeInSection from "@/components/ui/FadeInSection";
import JsonLd from "@/components/seo/JsonLd";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SITE_URL } from "@/lib/seo";
import { restaurants } from "@/data/restaurants";
import type { BannerSlide } from "@/components/home/HeroBanner";

const restaurantListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Two In One Restaurants",
  itemListElement: restaurants.map((r, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: r.name,
    url: r.url,
  })),
  url: SITE_URL,
};

// ISR: serve a cached page, refresh data at most once per minute (admin
// edits also bust this cache via revalidatePath). Big speed win.
export const revalidate = 60;

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
      <JsonLd data={restaurantListSchema} />
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
      <SpinWheel />
    </>
  );
}
