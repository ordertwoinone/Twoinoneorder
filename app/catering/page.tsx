import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, UtensilsCrossed } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TopBar from "@/components/layout/TopBar";
import BookingForm from "@/components/catering/BookingForm";

export const metadata: Metadata = {
  title: "Catering Booking — Two In One UAE",
  description:
    "Book catering for weddings, corporate events, birthdays and more. Authentic food from four restaurants delivered to your event.",
};

export default function CateringPage() {
  return (
    <>
      <TopBar />
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 mb-5">
            <UtensilsCrossed size={30} className="text-amber-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Catering for Every Occasion
          </h1>
          <p className="text-neutral-400 max-w-xl mx-auto">
            Fill in the form below and our team will contact you within 2 hours to
            confirm your catering booking.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-neutral-50 min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-amber-600 mb-6 transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Home
          </Link>

          <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-8">
            <h2 className="text-xl font-bold text-neutral-900 mb-2">
              Catering Enquiry
            </h2>
            <p className="text-sm text-neutral-500 mb-8">
              We&apos;ll send your details via WhatsApp for a fast reply.
            </p>
            <BookingForm />
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
