"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Clock, ArrowRight } from "lucide-react";
import { restaurants } from "@/data/restaurants";

const BADGE_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  "Free Delivery": { label: "Free Delivery", bg: "#16a34a", text: "#fff" },
  "Best Seller":   { label: "Best Seller",   bg: "#ea580c", text: "#fff" },
  "Popular":       { label: "Popular",        bg: "#dc2626", text: "#fff" },
  "New":           { label: "NEW",            bg: "#7c3aed", text: "#fff" },
};

export default function RestaurantCards() {
  return (
    <section id="restaurants" className="py-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Our Restaurants</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Tap to order · Fast delivery across UAE</p>
          </div>
          <a
            href="#restaurants"
            className="flex items-center gap-1 text-xs font-bold"
            style={{ color: "#ea580c" }}
          >
            View All <ArrowRight size={13} />
          </a>
        </div>

        {/* Horizontal scroll row */}
        <div className="flex gap-3 overflow-x-auto scrollbar-none px-4 pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
          {restaurants.map((r, i) => {
            const badge = r.badge ? BADGE_STYLE[r.badge] : null;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.35 }}
                className="flex-shrink-0 sm:flex-shrink"
                style={{ minWidth: "175px" }}
              >
                <a
                  href={r.url}
                  className="block bg-white rounded-2xl overflow-hidden group border border-gray-100 transition-shadow hover:shadow-md"
                  style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
                >
                  {/* Image */}
                  <div className="relative" style={{ height: "120px" }}>
                    <Image
                      src={r.foodImage}
                      alt={r.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 175px, 25vw"
                      priority={i < 2}
                    />

                    {/* Badge top-left */}
                    {badge && (
                      <span
                        className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full z-10"
                        style={{ background: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </span>
                    )}

                    {/* Logo top-right */}
                    <div className="absolute top-2 right-2 w-9 h-9 rounded-xl bg-white shadow-sm overflow-hidden p-1 z-10">
                      <Image
                        src={r.logo}
                        alt={`${r.name} logo`}
                        width={32}
                        height={32}
                        className="object-contain w-full h-full"
                      />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="px-3 pt-2.5 pb-3">
                    {/* Rating + time */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500">
                        <Star size={10} className="fill-amber-400 stroke-amber-400" />
                        {r.rating}
                      </span>
                      <span className="text-gray-300 text-[10px]">·</span>
                      <span className="flex items-center gap-0.5 text-gray-400 text-[10px]">
                        <Clock size={9} />
                        {r.deliveryTime}
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="text-gray-900 font-extrabold text-sm leading-tight mb-0.5 truncate">
                      {r.name}
                    </h3>

                    {/* Cuisine */}
                    <p className="text-gray-400 text-[10px] truncate mb-1.5">
                      {r.cuisine.join(", ")}
                    </p>

                    {/* Free delivery */}
                    <p className="text-[11px] font-semibold" style={{ color: "#16a34a" }}>
                      Free delivery
                    </p>
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
