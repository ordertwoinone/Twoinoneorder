import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import FavouritesClient from "./FavouritesClient";

export const metadata: Metadata = {
  title: "Favourites",
  robots: { index: false, follow: false },
};

export default function FavouritesPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white min-h-[70vh] pb-20 sm:pb-8">
        <FavouritesClient />
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
