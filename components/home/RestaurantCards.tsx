"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Clock, Truck, TrendingUp, Flame, ArrowUpRight } from "lucide-react";
import { restaurants } from "@/data/restaurants";

const BADGE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  "Free Delivery": { label: "Free Delivery", icon: <Truck size={9} />,       color: "#16a34a" },
  "Best Seller":   { label: "Best Seller",   icon: <TrendingUp size={9} />,  color: "#d97706" },
  "Popular":       { label: "Popular",        icon: <Flame size={9} />,       color: "#dc2626" },
};

const CARD = {
  background: "#ffffff",
  boxShadow: "0 2px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
} as const;

export default function RestaurantCards() {
  return (
    <section id="restaurants" className="py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Our Restaurants</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Tap to order · Fast delivery across UAE</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-green-700 font-semibold bg-white px-3 py-1.5 rounded-full" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            All Open
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {restaurants.map((r, i) => {
            const badge = r.badge ? BADGE_CONFIG[r.badge] : null;
            return (
              <motion.a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                whileHover={{ y: -5, boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}
                className="rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer group flex flex-col"
                style={CARD}
              >
                {/* Food image */}
                <div className="relative h-32 sm:h-44 overflow-hidden">
                  <Image
                    src={r.foodImage}
                    alt={r.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  {badge && (
                    <span
                      className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: badge.color }}
                    >
                      {badge.icon}{badge.label}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gray-50 border border-gray-100 p-1.5 flex-shrink-0 overflow-hidden">
                      <Image src={r.logo} alt={`${r.name} logo`} width={40} height={40} className="object-contain w-full h-full" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-[13px] sm:text-sm leading-tight truncate" style={{ color: r.color }}>
                        {r.name}
                      </h3>
                      <p className="text-[9px] sm:text-[10px] text-gray-400 truncate">{r.cuisine.join(", ")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex items-center gap-0.5 text-amber-500 font-bold text-[11px]">
                      <Star size={10} className="fill-amber-400" />{r.rating}
                    </span>
                    <span className="flex items-center gap-0.5 text-gray-400 text-[10px]">
                      <Clock size={9} />{r.deliveryTime}
                    </span>
                  </div>

                  <button
                    className="mt-auto w-full py-2 rounded-xl text-[11px] sm:text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all group-hover:gap-2.5"
                    style={{ background: r.color, boxShadow: `0 4px 12px ${r.color}35` }}
                  >
                    ORDER NOW <ArrowUpRight size={12} />
                  </button>
                </div>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
