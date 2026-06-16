import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TableBookingPage from "@/components/book-table/TableBookingPage";

export const metadata: Metadata = {
  title: "Book a Table",
  description:
    "Reserve your table at Two In One near University City, Kalba. Pick your spot indoors or outdoors and confirm instantly on WhatsApp.",
  alternates: { canonical: "/book-table" },
};

export default function BookTablePage() {
  return (
    <>
      <Navbar />
      <TableBookingPage />
      <Footer />
    </>
  );
}
