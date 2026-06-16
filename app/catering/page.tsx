import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, UtensilsCrossed, Users, CalendarCheck, Star } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import BookingForm from "@/components/catering/BookingForm";

export const metadata: Metadata = {
  title: "Catering Booking",
  description:
    "Book catering for weddings, corporate events, birthdays and more. Authentic food from four restaurants delivered to your event.",
  alternates: { canonical: "/catering" },
};

const HIGHLIGHTS = [
  { icon: Users,          title: "10–5000 Guests", sub: "Any event size" },
  { icon: UtensilsCrossed, title: "4 Cuisines",     sub: "Arabic, Indian & more" },
  { icon: CalendarCheck,  title: "2-Hour Reply",    sub: "Fast confirmation" },
];

const FOOD_BUBBLES = ["🥘", "🍛", "🫓", "🧆", "🍢", "🍰"];

export default function CateringPage() {
  return (
    <>
      <Navbar />

      <main className="bg-white pb-20 sm:pb-8">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="px-4 pt-4">
          <div className="max-w-5xl mx-auto">
            <div
              className="relative overflow-hidden rounded-3xl px-6 sm:px-10 py-9 sm:py-12"
              style={{ background: "linear-gradient(120deg,#fff7ed 0%,#ffedd5 55%,#fed7aa 100%)" }}
            >
              <div className="relative z-10 max-w-xl">
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full mb-4"
                  style={{ color: "#ea580c", border: "1.5px solid #ea580c", background: "#ea580c10" }}
                >
                  <Star size={12} className="fill-orange-500 stroke-orange-500" />
                  Catering Service
                </span>

                <h1 className="text-2xl sm:text-4xl font-black leading-tight text-gray-900 mb-3">
                  Catering for{" "}
                  <span style={{ color: "#ea580c" }}>Every Occasion</span>
                </h1>
                <p className="text-gray-600 text-[13px] sm:text-[15px] leading-relaxed max-w-md">
                  From weddings to corporate lunches — authentic food from all four
                  restaurants, delivered to your event. Fill the form and our team
                  replies within 2 hours.
                </p>

                {/* Highlights */}
                <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3 max-w-md">
                  {HIGHLIGHTS.map(({ icon: Icon, title, sub }) => (
                    <div
                      key={title}
                      className="bg-white/70 backdrop-blur-sm rounded-2xl px-2 py-3 text-center shadow-sm border border-white"
                    >
                      <Icon size={18} className="mx-auto mb-1.5 text-orange-500" />
                      <p className="text-[11px] sm:text-[12px] font-extrabold text-gray-900 leading-tight">{title}</p>
                      <p className="text-[9px] sm:text-[10px] text-gray-500 leading-tight mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decorative food bubbles (desktop) */}
              <div className="absolute right-0 top-0 bottom-0 w-[38%] hidden md:block pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-56 h-56 rounded-full border border-dashed border-orange-300/50 absolute orbit-ring-spin" />
                  <div className="w-36 h-36 rounded-full border border-dashed border-orange-300/60 absolute orbit-ring-spin-rev" />
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl center-pulse">
                    🍽️
                  </div>
                </div>
                {FOOD_BUBBLES.map((emoji, i) => {
                  const pos = [
                    { top: "12%", left: "48%" }, { top: "30%", left: "78%" },
                    { top: "58%", left: "70%" }, { top: "20%", left: "20%" },
                    { top: "70%", left: "38%" }, { top: "78%", left: "62%" },
                  ][i];
                  return (
                    <div
                      key={emoji}
                      className={`absolute w-11 h-11 flex items-center justify-center rounded-full bg-white shadow-md text-lg ${i % 2 === 0 ? "food-bubble" : "food-bubble-alt"}`}
                      style={{ ...pos, animationDelay: `${i * 0.4}s` }}
                    >
                      {emoji}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Form ─────────────────────────────────────────────── */}
        <section className="px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 mb-5 transition-colors"
            >
              <ChevronLeft size={16} />
              Back to Home
            </Link>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-8">
              <h2 className="text-xl font-extrabold text-gray-900 mb-1.5">
                Catering Enquiry
              </h2>
              <p className="text-sm text-gray-500 mb-7">
                We&apos;ll send your details via WhatsApp for a fast reply.
              </p>
              <BookingForm />
            </div>
          </div>
        </section>

        <Footer />
      </main>

      <BottomNav />
      <WhatsAppButton />
    </>
  );
}
