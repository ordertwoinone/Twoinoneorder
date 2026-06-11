import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TableBookingPage from "@/components/book-table/TableBookingPage";

export const metadata = {
  title: "Book a Table — Two In One UAE",
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
