import type { Metadata } from "next";
import Image from "next/image";
import { Tag, ArrowRight, Sparkles } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Offers & Deals",
  description:
    "Discover the latest offers, discounts and deals across all four Two In One restaurants in the UAE.",
  alternates: { canonical: "/offers" },
};

interface Offer {
  id: string;
  badge_text: string;
  badge_color: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_href: string;
  image_url: string;
  bg_color: string;
}

async function getOffers(): Promise<Offer[]> {
  const { data, error } = await supabaseAdmin
    .from("offers")
    .select("id, badge_text, badge_color, title, subtitle, cta_text, cta_href, image_url, bg_color")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return [];
  return data;
}

export default async function OffersPage() {
  const offers = await getOffers();

  return (
    <>
      <Navbar />

      <main className="bg-white pb-20 sm:pb-8">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="px-4 pt-4">
          <div className="max-w-6xl mx-auto">
            <div
              className="relative overflow-hidden rounded-3xl px-6 sm:px-10 py-9 sm:py-12"
              style={{ background: "linear-gradient(120deg,#fff7ed 0%,#ffedd5 55%,#fed7aa 100%)" }}
            >
              <div className="relative z-10 max-w-xl">
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full mb-4"
                  style={{ color: "#ea580c", border: "1.5px solid #ea580c", background: "#ea580c10" }}
                >
                  <Sparkles size={12} className="fill-orange-500 stroke-orange-500" />
                  Limited Time
                </span>
                <h1 className="text-2xl sm:text-4xl font-black leading-tight text-gray-900 mb-3">
                  Offers &amp; <span style={{ color: "#ea580c" }}>Deals</span>
                </h1>
                <p className="text-gray-600 text-[13px] sm:text-[15px] leading-relaxed max-w-md">
                  Grab the latest discounts and combos across all four Two In One
                  restaurants — fresh deals added regularly.
                </p>
              </div>

              {/* Decorative rings + emojis (desktop) */}
              <div className="absolute right-0 top-0 bottom-0 w-[36%] hidden md:block pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-52 h-52 rounded-full border border-dashed border-orange-300/50 absolute orbit-ring-spin" />
                  <div className="w-32 h-32 rounded-full border border-dashed border-orange-300/60 absolute orbit-ring-spin-rev" />
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl center-pulse">
                    🏷️
                  </div>
                </div>
                {["🔥", "💯", "🎁", "⭐"].map((emoji, i) => {
                  const pos = [
                    { top: "16%", left: "52%" }, { top: "34%", left: "80%" },
                    { top: "62%", left: "70%" }, { top: "72%", left: "40%" },
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

        {/* ── Offers grid ──────────────────────────────────────── */}
        <section className="px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {offers.length > 0 ? (
              <>
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-4">
                  Available Now
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {offers.map((offer) => {
                    const isExternal = offer.cta_href?.startsWith("http");
                    const Card = (
                      <div
                        className="relative flex rounded-2xl overflow-hidden border border-gray-100 transition-shadow hover:shadow-lg group h-full"
                        style={{
                          background: offer.bg_color || "#ffffff",
                          minHeight: "150px",
                          boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
                        }}
                      >
                        {/* LEFT: text */}
                        <div className="flex flex-col justify-between p-5 sm:p-6 flex-1 z-10 pr-2">
                          {offer.badge_text && (
                            <span
                              className="inline-block text-white text-[11px] font-bold px-3 py-1 rounded-full mb-2 w-fit"
                              style={{ background: offer.badge_color || "#ea580c" }}
                            >
                              {offer.badge_text}
                            </span>
                          )}
                          <h3 className="text-gray-900 font-extrabold text-base sm:text-lg leading-tight mb-1">
                            {offer.title}
                          </h3>
                          {offer.subtitle && (
                            <p className="text-gray-500 text-[12px] sm:text-[13px] leading-relaxed mb-3 line-clamp-2">
                              {offer.subtitle}
                            </p>
                          )}
                          <div
                            className="inline-flex items-center gap-1.5 self-start px-4 py-2 rounded-full text-white text-[12px] sm:text-[13px] font-bold transition-all group-hover:gap-2.5"
                            style={{ background: "#ea580c" }}
                          >
                            {offer.cta_text || "Order Now"}
                            <ArrowRight size={13} />
                          </div>
                        </div>

                        {/* RIGHT: image */}
                        {offer.image_url && (
                          <div className="relative w-[40%] shrink-0">
                            <Image
                              src={offer.image_url}
                              alt={offer.title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              sizes="(max-width: 640px) 40vw, 20vw"
                            />
                            <div
                              className="absolute inset-0"
                              style={{
                                background: `linear-gradient(to right, ${offer.bg_color || "#fff"} 0%, ${offer.bg_color || "#fff"}88 18%, transparent 55%)`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );

                    return isExternal ? (
                      <a key={offer.id} href={offer.cta_href}>{Card}</a>
                    ) : (
                      <a key={offer.id} href={offer.cta_href || "#"}>{Card}</a>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="max-w-md mx-auto text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-50 flex items-center justify-center">
                  <Tag size={28} className="text-orange-500" />
                </div>
                <h2 className="text-lg font-extrabold text-gray-900 mb-1.5">No offers right now</h2>
                <p className="text-sm text-gray-500">
                  Check back soon — new deals are added regularly across all our restaurants.
                </p>
              </div>
            )}
          </div>
        </section>

        <Footer />
      </main>

      <BottomNav />
    </>
  );
}
