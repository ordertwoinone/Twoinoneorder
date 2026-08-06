import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import FavouritesClient from "./FavouritesClient";
import PageMeta from "@/lib/i18n/PageMeta";

export const metadata: Metadata = {
  title: "Favourites",
  robots: { index: false, follow: false },
};

export default function FavouritesPage() {
  return (
    <>
      <PageMeta titleKey="favourites.metaTitle" />
      <Navbar />
      <main className="bg-white min-h-[70vh] pb-20 sm:pb-8">
        <FavouritesClient />
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
