import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import SpinWheel from "@/components/home/SpinWheel";
import SearchBar from "@/components/home/SearchBar";
import HeroBanner from "@/components/home/HeroBanner";
import HeroBannerWeb from "@/components/home/HeroBannerWeb";
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

async function getBanners(platform: "mobile" | "web"): Promise<BannerSlide[]> {
  const { data } = await supabaseAdmin
    .from("hero_banners")
    .select("*")
    .eq("is_active", true)
    .eq("platform", platform)
    .order("sort_order", { ascending: true });
  return data || [];
}

export default async function HomePage() {
  const [mobileBanners, webBanners] = await Promise.all([
    getBanners("mobile"),
    getBanners("web"),
  ]);

  return (
    <>
      <JsonLd data={restaurantListSchema} />
      <Navbar />
      <main className="pb-20 sm:pb-0">
        <div className="sticky top-14 sm:top-16 z-30 bg-white border-b border-gray-100">
          <SearchBar />
        </div>

        {/* Mobile layout: categories on top, then swipeable banner cards */}
        <div className="sm:hidden">
          <HomeCategories variant="mobile" />
          <HeroBanner slides={mobileBanners} />
        </div>

        {/* Web layout: slideshow hero, then categories with heading */}
        <div className="hidden sm:block">
          <HeroBannerWeb slides={webBanners} />
          <FadeInSection><HomeCategories variant="web" /></FadeInSection>
        </div>

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
