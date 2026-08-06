import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import AddressesClient from "./AddressesClient";
import PageMeta from "@/lib/i18n/PageMeta";

export const metadata: Metadata = {
  title: "Saved Addresses",
  robots: { index: false, follow: false },
};

export default function AddressesPage() {
  return (
    <>
      <PageMeta titleKey="addresses.metaTitle" />
      <Navbar />
      <main className="bg-white min-h-[70vh] pb-20 sm:pb-8">
        <AddressesClient />
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
