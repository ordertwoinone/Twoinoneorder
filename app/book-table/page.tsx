import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import TableBookingPage from "@/components/book-table/TableBookingPage";
import { toBookTable, type BookingTableRow } from "@/components/book-table/tableData";
import { supabaseAdmin } from "@/lib/supabase-admin";
import PageMeta from "@/lib/i18n/PageMeta";

export const revalidate = 60;

/**
 * The floor plan comes from admin → Book a Table. An empty result (or a
 * database that has not run supabase/booking_tables.sql yet) leaves the page
 * on the layout drawn in tableData.ts.
 */
async function getTables() {
  const { data } = await supabaseAdmin
    .from("booking_tables")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return ((data ?? []) as BookingTableRow[]).map(toBookTable);
}

export const metadata: Metadata = {
  title: "Book a Table",
  description:
    "Reserve your table at Two In One near University City, Kalba. Pick your spot indoors or outdoors and confirm instantly on WhatsApp.",
  alternates: { canonical: "/book-table" },
};

export default async function BookTablePage() {
  const tables = await getTables();

  return (
    <>
      <PageMeta titleKey="booking.metaTitle" descriptionKey="booking.metaDescription" />
      <Navbar />
      <TableBookingPage tables={tables} />
      <Footer />
      <BottomNav />
    </>
  );
}
