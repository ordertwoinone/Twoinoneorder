import TopBar from "@/components/layout/TopBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import LocationBar from "@/components/home/LocationBar";
import SearchBar from "@/components/home/SearchBar";
import HeroBanner from "@/components/home/HeroBanner";
import CateringSection from "@/components/home/CateringSection";
import RestaurantCards from "@/components/home/RestaurantCards";
import OffersBanner from "@/components/home/OffersBanner";
import TrustBadges from "@/components/home/TrustBadges";

export default function HomePage() {
  return (
    <>
      <TopBar />
      <Navbar />
      <main className="pb-20 sm:pb-0">
        <div className="sticky top-16 z-30 bg-white border-b border-gray-100" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
          <LocationBar />
          <SearchBar />
        </div>
        <HeroBanner />
        <CateringSection />
        <RestaurantCards />
        <OffersBanner />
        <TrustBadges />
        <Footer />
      </main>
      <BottomNav />
      <WhatsAppButton />
    </>
  );
}
