import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import SpinWheel from "@/components/home/SpinWheel";
import SearchBar from "@/components/home/SearchBar";
import HeroBannerMobile from "@/components/home/HeroBannerMobile";
import HeroBannerWeb from "@/components/home/HeroBannerWeb";
import RestaurantCards from "@/components/home/RestaurantCards";
import TopPicks from "@/components/home/TopPicks";
import HomepageCards from "@/components/home/HomepageCards";
import HomeCategories from "@/components/home/HomeCategories";
import LocationBar from "@/components/home/LocationBar";
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
  const webBanners = await getBanners("web");

  return (
    <>
      <JsonLd data={restaurantListSchema} />
      <Navbar />
      <main className="pb-36 sm:pb-0">
        {/* Desktop: sticky search bar under the navbar */}
        <div className="hidden sm:block sticky top-16 z-30 bg-white border-b border-gray-100">
          <SearchBar />
        </div>

        {/* Mobile layout: deliver bar, rounded full-bleed hero, then a white
            "second section" sheet with a rounded top that rises over the hero,
            holding the search pill + category row */}
        <div className="sm:hidden">
          <LocationBar />
          <HeroBannerMobile />
          <div className="relative z-20 -mt-7 bg-white rounded-t-[28px]">
            <SearchBar />
            <HomeCategories variant="mobile" />
          </div>
        </div>

        {/* Web layout: slideshow hero, then categories with heading */}
        <div className="hidden sm:block">
          <HeroBannerWeb slides={webBanners} />
          <FadeInSection><HomeCategories variant="web" /></FadeInSection>
        </div>

        <FadeInSection><RestaurantCards /></FadeInSection>
        <FadeInSection><TopPicks /></FadeInSection>
        <FadeInSection><HomepageCards /></FadeInSection>
        <FadeInSection><TrustBadges /></FadeInSection>
        <Footer />
      </main>
      <BottomNav />
      <SpinWheel />
    </>
  );
}
