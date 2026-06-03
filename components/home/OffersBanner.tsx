"use client";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { offers } from "@/data/offers";

export default function OffersBanner() {
  return (
    <section id="offers" className="py-4 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Today&apos;s Offers</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Limited time deals — grab them now</p>
          </div>
          <span className="text-xs text-orange-600 font-bold flex items-center gap-1 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
            🔥 Hot Deals
          </span>
        </div>

        {/* Gradient backdrop for glass effect */}
        <div
          className="rounded-3xl p-3 sm:p-4"
          style={{
            background:
              "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%)",
          }}
        >
          {/* Inner scrollable row */}
          <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
            {offers.map((offer, i) => (
              <motion.a
                key={offer.id}
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="relative rounded-2xl overflow-hidden flex-shrink-0 sm:flex-shrink min-w-[170px] sm:min-w-0 cursor-pointer group"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                }}
              >
                {/* Colored accent top bar using offer gradient */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 opacity-80"
                  style={{
                    background: `linear-gradient(90deg, ${offer.bgFrom}, ${offer.bgTo})`,
                  }}
                />

                {/* Subtle glow blob */}
                <div
                  className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 pointer-events-none blur-xl"
                  style={{ background: offer.bgFrom }}
                />

                <div className="relative p-4 flex flex-col min-h-[165px] sm:min-h-[185px]">
                  {/* Badge */}
                  {offer.badge && (
                    <span
                      className="absolute top-3 right-3 text-white text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${offer.bgFrom}, ${offer.bgTo})`,
                      }}
                    >
                      {offer.badge}
                    </span>
                  )}

                  {/* Emoji */}
                  <span className="text-4xl sm:text-[44px] drop-shadow-lg leading-none mb-2">
                    {offer.emoji}
                  </span>

                  {/* Discount — big colored text */}
                  <p
                    className="font-black text-[26px] sm:text-3xl leading-none mb-1"
                    style={{ color: offer.bgFrom === "#ff6b6b" ? "#ff6b6b" : offer.bgTo }}
                  >
                    {offer.discount}
                  </p>

                  {/* Title + subtitle */}
                  <h3 className="text-white font-bold text-[13px] sm:text-sm leading-tight mb-0.5">
                    {offer.title}
                  </h3>
                  <p className="text-white/50 text-[10px] leading-relaxed">{offer.subtitle}</p>

                  {/* CTA */}
                  <div className="mt-auto pt-3">
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-[10px] font-bold transition-all group-hover:gap-2"
                      style={{
                        background: `linear-gradient(135deg, ${offer.bgFrom}cc, ${offer.bgTo}cc)`,
                      }}
                    >
                      Grab Deal
                      <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
