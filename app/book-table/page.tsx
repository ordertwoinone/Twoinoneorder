import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import TableBookingPage from "@/components/book-table/TableBookingPage";
import PageMeta from "@/lib/i18n/PageMeta";

export const metadata: Metadata = {
  title: "Book a Table",
  description:
    "Reserve your table at Two In One near University City, Kalba. Pick your spot indoors or outdoors and confirm instantly on WhatsApp.",
  alternates: { canonical: "/book-table" },
};

export default function BookTablePage() {
  return (
    <>
      <PageMeta titleKey="booking.metaTitle" descriptionKey="booking.metaDescription" />
      <Navbar />
      <TableBookingPage />
      <Footer />
      <BottomNav />
    </>
  );
}
