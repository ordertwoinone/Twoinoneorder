import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import BuffetContent from "./BuffetContent";

export default function BuffetPage() {
  return (
    <>
      <Navbar className="hidden sm:block" />
      <main className="bg-white pb-24 sm:pb-0">
        <BuffetContent />
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
