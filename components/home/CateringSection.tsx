"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Star, Users, CalendarCheck } from "lucide-react";

const STATS = [
  { icon: Star,          value: "5.0",  label: "Rating", color: "#f59e0b" },
  { icon: Users,         value: "500+", label: "Events",  color: "#16a34a" },
  { icon: CalendarCheck, value: "UAE",  label: "Wide",    color: "#2563eb" },
];

export default function CateringSection() {
  return (
    <section className="px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl overflow-hidden flex flex-col sm:flex-row bg-white"
          style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)", minHeight: "165px" }}
        >
          {/* LEFT */}
          <div className="flex-1 flex flex-col justify-center px-6 sm:px-8 py-7 sm:py-8 order-2 sm:order-1 relative">
            <div className="absolute left-0 top-8 bottom-8 w-1 rounded-r-full bg-gradient-to-b from-green-400 to-emerald-600" />

            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-3 py-1 rounded-full mb-3 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Catering Service
            </span>

            <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight mb-1.5">
              We Cater Every <span className="text-green-600">Occasion</span>
            </h3>
            <p className="text-gray-400 text-xs sm:text-sm mb-5 leading-relaxed">
              Weddings · Corporate Events · Birthdays · Gatherings. Full setup &amp; service across UAE.
            </p>

            <div className="flex gap-5 mb-5">
              {STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${s.color}12` }}>
                      <Icon size={14} style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="text-gray-900 font-black text-sm leading-none">{s.value}</p>
                      <p className="text-gray-400 text-[9px] mt-0.5 uppercase tracking-wide">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              href="/catering"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all hover:gap-3 active:scale-95 w-fit"
              style={{ boxShadow: "0 4px 16px rgba(22,163,74,0.30)" }}
            >
              BOOK A CATERING <ArrowRight size={13} />
            </Link>
          </div>

          {/* RIGHT: image */}
          <div className="relative w-full sm:w-60 lg:w-80 h-52 sm:h-auto flex-shrink-0 order-1 sm:order-2">
            <Image
              src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80"
              alt="Elegant catering event"
              fill className="object-cover"
              sizes="(max-width: 640px) 100vw, 320px"
            />
            <div className="absolute inset-0 hidden sm:block" style={{ background: "linear-gradient(to right, rgba(255,255,255,0.60) 0%, transparent 40%)" }} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
