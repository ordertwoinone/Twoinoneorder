"use client";
import Image from "next/image";
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
          <span className="text-xs text-orange-600 font-bold flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-full" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            🔥 Hot Deals
          </span>
        </div>

        {/* Cards — horizontal scroll on mobile, 2-col on tablet, 4-col on desktop */}
        <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:mx-0 sm:px-0">
          {offers.map((offer, i) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex-shrink-0 sm:flex-shrink min-w-[270px] sm:min-w-0"
            >
              <a
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex rounded-2xl overflow-hidden cursor-pointer group"
                style={{
                  background: offer.darkBg,
                  height: "155px",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.20)",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.28)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.20)";
                }}
              >
                {/* ── RIGHT: food image bleeding to edge ── */}
                <div className="absolute right-0 top-0 bottom-0 w-[44%]">
                  <Image
                    src={offer.image}
                    alt={offer.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 120px, 25vw"
                    loading="lazy"
                  />
                  {/* Gradient: dark bg colour → transparent, blends image into card */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to right, ${offer.darkBg} 0%, ${offer.darkBg}cc 20%, transparent 60%)`,
                    }}
                  />
                </div>

                {/* ── LEFT: text content ── */}
                <div className="relative z-10 flex flex-col justify-between p-4 sm:p-5 w-[62%]">
                  {/* Top section */}
                  <div>
                    {/* Tag */}
                    <p className="text-white/50 text-[10px] font-semibold mb-1 tracking-wide">
                      {offer.tag}
                    </p>

                    {/* Big discount / headline */}
                    <h3 className="text-white font-black text-xl sm:text-2xl leading-tight mb-1">
                      {offer.discount}
                    </h3>

                    {/* Subtitle */}
                    <p className="text-white/55 text-[10px] sm:text-[11px] leading-relaxed line-clamp-2">
                      {offer.subtitle}
                    </p>
                  </div>

                  {/* CTA button */}
                  <div
                    className="inline-flex items-center gap-1.5 self-start px-4 py-2 rounded-full text-white text-[11px] font-bold mt-3 transition-all group-hover:gap-2.5"
                    style={{
                      background: offer.btnColor,
                      boxShadow: `0 4px 14px ${offer.btnColor}55`,
                    }}
                  >
                    {offer.ctaLabel}
                    <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>

                {/* Badge top-right */}
                {offer.badge && (
                  <span
                    className="absolute top-3 right-3 z-20 text-[9px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: offer.btnColor }}
                  >
                    {offer.badge}
                  </span>
                )}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
