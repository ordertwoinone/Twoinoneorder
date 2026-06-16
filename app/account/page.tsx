import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "My Account",
  description: "Sign in to manage your Two In One account, orders and favourites.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white min-h-[70vh] pb-20 sm:pb-8">
        <AccountClient />
      </main>
      <Footer />
      <BottomNav />
      <WhatsAppButton />
    </>
  );
}
