import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import OrdersClient from "./OrdersClient";

export const metadata: Metadata = { title: "My Orders — Two In One UAE" };

export default function OrdersPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white min-h-[70vh] pb-20 sm:pb-8">
        <OrdersClient />
      </main>
      <Footer />
      <BottomNav />
      <WhatsAppButton />
    </>
  );
}
