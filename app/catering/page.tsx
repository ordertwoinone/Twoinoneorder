import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, UtensilsCrossed, Users, CalendarCheck, Star } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import BookingForm from "@/components/catering/BookingForm";
import { T } from "@/lib/i18n/T";
import PageMeta from "@/lib/i18n/PageMeta";
import type { TranslationKey } from "@/lib/i18n/types";

export const metadata: Metadata = {
  title: "Catering Booking",
  description:
    "Book catering for weddings, corporate events, birthdays and more. Authentic food from four restaurants delivered to your event.",
  alternates: { canonical: "/catering" },
};

const HIGHLIGHTS: { icon: typeof Users; titleKey: TranslationKey; subKey: TranslationKey }[] = [
  { icon: Users,           titleKey: "catering.highlightGuestsTitle",   subKey: "catering.highlightGuestsSub" },
  { icon: UtensilsCrossed, titleKey: "catering.highlightCuisinesTitle", subKey: "catering.highlightCuisinesSub" },
  { icon: CalendarCheck,   titleKey: "catering.highlightReplyTitle",    subKey: "catering.highlightReplySub" },
];

const FOOD_BUBBLES = ["🥘", "🍛", "🫓", "🧆", "🍢", "🍰"];

export default function CateringPage() {
  return (
    <>
      <PageMeta titleKey="catering.metaTitle" descriptionKey="catering.metaDescription" />
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
                  <T k="catering.badge" />
                </span>

                <h1 className="text-2xl sm:text-4xl font-black leading-tight text-gray-900 mb-3">
                  <T k="catering.title" />{" "}
                  <span style={{ color: "#ea580c" }}><T k="catering.titleHighlight" /></span>
                </h1>
                <p className="text-gray-600 text-[13px] sm:text-[15px] leading-relaxed max-w-md">
                  <T k="catering.subtitle" />
                </p>

                {/* Highlights */}
                <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3 max-w-md">
                  {HIGHLIGHTS.map(({ icon: Icon, titleKey, subKey }) => (
                    <div
                      key={titleKey}
                      className="bg-white/70 backdrop-blur-sm rounded-2xl px-2 py-3 text-center shadow-sm border border-white"
                    >
                      <Icon size={18} className="mx-auto mb-1.5 text-orange-500" />
                      <p className="text-[11px] sm:text-[12px] font-extrabold text-gray-900 leading-tight"><T k={titleKey} /></p>
                      <p className="text-[9px] sm:text-[10px] text-gray-500 leading-tight mt-0.5"><T k={subKey} /></p>
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
              <T k="catering.backHome" />
            </Link>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-8">
              <h2 className="text-xl font-extrabold text-gray-900 mb-1.5">
                <T k="catering.formTitle" />
              </h2>
              <p className="text-sm text-gray-500 mb-7">
                <T k="catering.formSubtitle" />
              </p>
              <BookingForm />
            </div>
          </div>
        </section>

        <Footer />
      </main>

      <BottomNav />
    </>
  );
}
