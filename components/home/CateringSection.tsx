"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Star, Users, MapPin } from "lucide-react";

const STATS = [
  { icon: Star, color: "#fbbf24", fill: true, value: "5.0", label: "Rating" },
  { icon: Users, color: "#93c5fd", fill: false, value: "500+", label: "Events" },
  { icon: MapPin, color: "#6ee7b7", fill: false, value: "UAE", label: "Wide" },
];

export default function CateringSection() {
  return (
    <section className="px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden"
          style={{ minHeight: "165px" }}
        >
          {/* Background image */}
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1530062845289-9109b2c9c868?w=1200&q=80"
              alt="Catering event setup"
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
          </div>

          {/* Gradient overlay — heavy on left, transparent right */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/95 via-gray-900/85 to-gray-900/30" />

          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-orange-400 to-transparent" />

          {/* Left accent bar */}
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-l-3xl" />

          {/* Content */}
          <div className="relative z-10 px-6 sm:px-8 py-6 sm:py-8">
            <div className="max-w-sm">
              {/* Tag pill */}
              <span className="inline-flex items-center gap-1.5 bg-amber-400/15 border border-amber-400/35 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-full mb-3">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                Premium Catering
              </span>

              {/* Headline */}
              <h3 className="text-[22px] sm:text-2xl font-black text-white leading-tight mb-1.5">
                We Cater Every
                <span className="text-amber-400"> Occasion</span>
              </h3>
              <p className="text-white/55 text-[11px] sm:text-sm mb-4 leading-relaxed">
                Weddings · Corporate Events · Birthday Parties · Gatherings.
                Full setup &amp; service across UAE.
              </p>

              {/* Stats row */}
              <div className="flex gap-5 mb-5">
                {STATS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="flex items-center gap-1.5">
                      <Icon
                        size={13}
                        style={{ color: s.color }}
                        className={s.fill ? "fill-current" : ""}
                      />
                      <div>
                        <p className="text-white font-bold text-xs leading-none">{s.value}</p>
                        <p className="text-white/45 text-[9px] leading-none mt-0.5">{s.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <Link
                href="/catering"
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-gray-900 text-xs font-bold px-5 py-2.5 rounded-xl transition-all hover:gap-3 active:scale-95 shadow-lg shadow-amber-400/25"
              >
                BOOK A CATERING
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
