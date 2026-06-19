import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import AddressesClient from "./AddressesClient";

export const metadata: Metadata = {
  title: "Saved Addresses",
  robots: { index: false, follow: false },
};

export default function AddressesPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white min-h-[70vh] pb-20 sm:pb-8">
        <AddressesClient />
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
