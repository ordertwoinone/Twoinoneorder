"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Clock, ArrowUpRight } from "lucide-react";
import { restaurants } from "@/data/restaurants";

const BADGES: Record<string, { label: string; bg: string }> = {
  "Free Delivery": { label: "Free Delivery", bg: "#ea580c" },
  "Best Seller":   { label: "Best Seller",   bg: "#16a34a" },
  "Popular":       { label: "Popular",        bg: "#dc2626" },
};

export default function RestaurantCards() {
  return (
    <section id="restaurants" className="py-4 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Our Restaurants</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Tap to order · Fast delivery across UAE</p>
          </div>
          <span
            className="flex items-center gap-1.5 text-xs text-green-700 font-semibold bg-white px-3 py-1.5 rounded-full"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            All Open
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {restaurants.map((r, i) => {
            const badge = r.badge ? BADGES[r.badge] : null;
            return (
              /* motion.div handles entrance animation only — no DOM nesting issues */
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                {/* Plain <a> as card — no interactive children nested inside */}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer group"
                  style={{
                    height: "320px",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.14)",
                    transition: "transform 0.25s ease, box-shadow 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 12px 36px rgba(0,0,0,0.18)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.14)";
                  }}
                >
                  {/* Full-bleed food image */}
                  <Image
                    src={r.foodImage}
                    alt={r.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                    priority={i < 2}
                  />

                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/40 to-black/10" />

                  {/* Top: logo + badge */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white shadow-md p-1.5 overflow-hidden">
                      <Image
                        src={r.logo}
                        alt={`${r.name} logo`}
                        width={40}
                        height={40}
                        className="object-contain w-full h-full"
                      />
                    </div>
                    {badge && (
                      <span
                        className="text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full text-white shadow-md"
                        style={{ background: badge.bg }}
                      >
                        {badge.label}
                      </span>
                    )}
                  </div>

                  {/* Bottom: rating + name + cuisine + ORDER NOW */}
                  <div className="absolute bottom-0 left-0 right-0 z-10">
                    <div className="px-3 pt-3 pb-2.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="flex items-center gap-0.5 text-amber-400 font-bold text-[11px]">
                          <Star size={11} className="fill-amber-400" />
                          {r.rating}
                        </span>
                        <span className="text-white/40 text-[10px]">·</span>
                        <span className="flex items-center gap-1 text-white/70 text-[10px]">
                          <Clock size={10} />
                          {r.deliveryTime}
                        </span>
                      </div>
                      <h3 className="text-white font-extrabold text-base sm:text-lg leading-tight mb-0.5 drop-shadow">
                        {r.name}
                      </h3>
                      <p className="text-white/55 text-[10px] sm:text-[11px] truncate">
                        {r.cuisine.join(" · ")}
                      </p>
                    </div>

                    {/* ORDER NOW — <div> is valid inside <a>, no nesting issues */}
                    <div
                      className="w-full py-3 sm:py-3.5 text-white font-bold text-[12px] sm:text-sm flex items-center justify-center gap-2 transition-all group-hover:brightness-110"
                      style={{ background: r.color }}
                    >
                      ORDER NOW <ArrowUpRight size={14} />
                    </div>
                  </div>
                </a>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
