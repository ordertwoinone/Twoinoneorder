import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import SearchBar from "@/components/home/SearchBar";
import HeroBanner from "@/components/home/HeroBanner";
import RestaurantCards from "@/components/home/RestaurantCards";
import BuffetHighlights from "@/components/home/BuffetHighlights";
import OffersBanner from "@/components/home/OffersBanner";
import TrustBadges from "@/components/home/TrustBadges";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="pb-20 sm:pb-0">
        <div className="sticky top-16 z-30 bg-white border-b border-gray-100">
          <SearchBar />
        </div>
        <HeroBanner />
        <RestaurantCards />
        <BuffetHighlights />
        <OffersBanner />
        <TrustBadges />
        <Footer />
      </main>
      <BottomNav />
      <WhatsAppButton />
    </>
  );
}
