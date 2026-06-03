"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Clock, ArrowUpRight } from "lucide-react";
import { restaurants } from "@/data/restaurants";

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
          <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            All Open
          </span>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {restaurants.map((r, i) => (
            <motion.a
              key={r.id}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.09, duration: 0.45 }}
              whileHover={{ y: -5 }}
              className="relative rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer group h-56 sm:h-72 flex flex-col"
              style={{ boxShadow: `0 4px 24px ${r.color}25` }}
            >
              {/* Full-bleed food image */}
              <div className="absolute inset-0">
                <Image
                  src={r.foodImage}
                  alt={r.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

              {/* Hover color wash */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-400"
                style={{ background: r.color }}
              />

              {/* Color accent bar at bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: r.color }}
              />

              {/* Content */}
              <div className="relative flex flex-col h-full p-3 sm:p-4 z-10">
                {/* Top: logo + badge */}
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white shadow-lg p-1 overflow-hidden">
                    <Image
                      src={r.logo}
                      alt={`${r.name} logo`}
                      width={40}
                      height={40}
                      className="object-contain w-full h-full"
                    />
                  </div>

                  {r.badge && (
                    <span
                      className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: r.color, color: "#fff" }}
                    >
                      {r.badge}
                    </span>
                  )}
                </div>

                {/* Bottom: info + button */}
                <div className="mt-auto">
                  {/* Rating + delivery */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex items-center gap-0.5 text-amber-400 font-bold text-[10px]">
                      <Star size={9} className="fill-amber-400" />
                      {r.rating}
                    </span>
                    <span className="w-0.5 h-0.5 rounded-full bg-white/40" />
                    <span className="flex items-center gap-0.5 text-white/60 text-[10px]">
                      <Clock size={9} />
                      {r.deliveryTime}
                    </span>
                  </div>

                  {/* Name */}
                  <h3 className="text-white font-extrabold text-sm sm:text-[15px] leading-tight mb-0.5 drop-shadow">
                    {r.name}
                  </h3>
                  <p className="text-white/50 text-[9px] sm:text-[10px] truncate mb-2.5">
                    {r.cuisine.join(" · ")}
                  </p>

                  {/* Order button */}
                  <button
                    className="w-full py-2 rounded-xl text-[10px] sm:text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all duration-200"
                    style={{ background: r.color }}
                  >
                    ORDER NOW
                    <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
