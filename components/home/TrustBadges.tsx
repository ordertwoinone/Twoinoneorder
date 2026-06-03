"use client";
import { motion } from "framer-motion";

const BADGES = [
  { emoji: "🛵", title: "Fast Delivery", desc: "15–40 min" },
  { emoji: "🛡️", title: "Safe & Secure", desc: "Payments" },
  { emoji: "🌿", title: "Fresh", desc: "Ingredients" },
  { emoji: "🎧", title: "Live Support", desc: "24/7" },
];

export default function TrustBadges() {
  return (
    <section className="px-4 py-5 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-4 gap-3">
          {BADGES.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              className="flex flex-col items-center text-center bg-gray-50 rounded-2xl py-3 px-2"
            >
              <span className="text-2xl sm:text-3xl mb-1.5">{b.emoji}</span>
              <p className="text-[11px] sm:text-xs font-bold text-gray-800 leading-tight">{b.title}</p>
              <p className="text-[10px] sm:text-xs text-gray-400 leading-tight">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
