"use client";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { offers } from "@/data/offers";

const CARD_SHADOW = "0 2px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)";

export default function OffersBanner() {
  return (
    <section id="offers" className="py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Today&apos;s Offers</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Limited time deals — grab them now</p>
          </div>
          <span className="text-xs text-orange-600 font-bold flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-full" style={{ boxShadow: CARD_SHADOW }}>
            🔥 Hot Deals
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:mx-0 sm:px-0">
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
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.97 }}
              className="relative flex-shrink-0 sm:flex-shrink min-w-[172px] sm:min-w-0 cursor-pointer group rounded-2xl overflow-hidden"
              style={{ background: "#ffffff", boxShadow: CARD_SHADOW }}
            >
              {/* Colored top accent */}
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${offer.bgFrom}, ${offer.bgTo})` }} />

              {/* Very subtle color wash */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `linear-gradient(160deg, ${offer.bgFrom}08 0%, transparent 50%)` }}
              />

              <div className="relative p-4 flex flex-col min-h-[168px] sm:min-h-[185px]">
                {offer.badge && (
                  <span
                    className="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: `linear-gradient(135deg, ${offer.bgFrom}, ${offer.bgTo})` }}
                  >
                    {offer.badge}
                  </span>
                )}

                <span className="text-4xl sm:text-[44px] leading-none mb-3 drop-shadow">{offer.emoji}</span>

                <p className="font-black text-[28px] sm:text-[30px] leading-none mb-1" style={{ color: offer.bgFrom }}>
                  {offer.discount}
                </p>

                <h3 className="text-gray-800 font-bold text-[13px] sm:text-sm leading-tight mb-0.5">{offer.title}</h3>
                <p className="text-gray-400 text-[10px] leading-relaxed">{offer.subtitle}</p>

                <div className="mt-auto pt-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[10px] font-bold transition-all group-hover:gap-2.5"
                    style={{ background: `linear-gradient(135deg, ${offer.bgFrom}, ${offer.bgTo})`, boxShadow: `0 4px 12px ${offer.bgFrom}35` }}
                  >
                    Grab Deal <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
