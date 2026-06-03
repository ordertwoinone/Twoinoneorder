"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Banner {
  id: number;
  tag: string;
  headline: string;
  sub: string;
  cta: string;
  ctaHref: string;
  color: string;
  ctaBg: string;
  foodImage: string;
  foodAlt: string;
  promoTop: string;
  promoBot: string;
}

const BANNERS: Banner[] = [
  {
    id: 1,
    tag: "⚡ Today's Special",
    headline: "Free Delivery\nAll Day",
    sub: "On orders above AED 30 from all restaurants.",
    cta: "ORDER NOW",
    ctaHref: "#restaurants",
    color: "#15803d",
    ctaBg: "#16a34a",
    foodImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    foodAlt: "Delicious food spread",
    promoTop: "AED 30",
    promoBot: "min order",
  },
  {
    id: 2,
    tag: "🧆 Falafel Al Nile",
    headline: "Crispy Falafel\nDelivered",
    sub: "Authentic Egyptian falafel, shawarma & classic wraps.",
    cta: "ORDER NOW",
    ctaHref: "https://order.falafelalnile.com",
    color: "#c2410c",
    ctaBg: "#ea580c",
    foodImage: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80",
    foodAlt: "Fresh falafel plate",
    promoTop: "20%",
    promoBot: "off today",
  },
  {
    id: 3,
    tag: "☕ Karak & Snack",
    headline: "Hot Karak\nEvery Day",
    sub: "Spiced karak chai, masala tea & street snacks delivered hot.",
    cta: "GET KARAK",
    ctaHref: "https://www.karaksnack.com",
    color: "#be123c",
    ctaBg: "#dc2626",
    foodImage: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&q=80",
    foodAlt: "Spiced karak tea",
    promoTop: "HOT",
    promoBot: "daily brew",
  },
  {
    id: 4,
    tag: "🎉 Catering",
    headline: "Book Your\nEvent Today",
    sub: "Weddings, corporate events & birthdays across UAE.",
    cta: "BOOK NOW",
    ctaHref: "/catering",
    color: "#1d4ed8",
    ctaBg: "#2563eb",
    foodImage: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80",
    foodAlt: "Catering food spread",
    promoTop: "5 ★",
    promoBot: "rated",
  },
];

const AUTOPLAY_MS = 4500;

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent((c) => (c + 1) % BANNERS.length), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + BANNERS.length) % BANNERS.length), []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, next]);

  const b = BANNERS[current];

  return (
    <section className="px-4 pt-3 pb-2" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={b.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="rounded-3xl overflow-hidden"
            style={{ background: "#ffffff", boxShadow: "0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-stretch h-48 sm:h-64">
              {/* LEFT: text */}
              <div className="flex flex-col justify-center px-5 sm:px-8 py-5 w-[58%] sm:w-[55%]">
                <motion.span
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
                  className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full mb-3 w-fit"
                  style={{ background: `${b.color}12`, color: b.color, border: `1px solid ${b.color}25` }}
                >
                  {b.tag}
                </motion.span>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
                  className="font-black leading-tight whitespace-pre-line mb-2 text-gray-900"
                  style={{ fontSize: "clamp(20px, 4.5vw, 34px)" }}
                >
                  {b.headline}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}
                  className="text-[11px] sm:text-sm text-gray-400 mb-5 leading-relaxed line-clamp-2"
                >
                  {b.sub}
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
                  <a
                    href={b.ctaHref}
                    target={b.ctaHref.startsWith("http") ? "_blank" : undefined}
                    rel={b.ctaHref.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-[11px] sm:text-sm font-bold transition-all hover:gap-3 active:scale-95"
                    style={{ background: b.ctaBg, boxShadow: `0 4px 16px ${b.ctaBg}45` }}
                  >
                    {b.cta}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </a>
                </motion.div>
              </div>

              {/* RIGHT: diagonal food image */}
              <div className="flex-1 relative">
                <div className="absolute inset-0" style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}>
                  <Image
                    src={b.foodImage} alt={b.foodAlt} fill
                    className="object-cover"
                    sizes="(max-width: 640px) 42vw, 45vw"
                    priority={b.id === 1}
                  />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(255,255,255,0.55) 0%, transparent 30%)" }} />
                </div>
                <div
                  className="absolute top-4 right-4 rounded-2xl flex flex-col items-center justify-center px-2.5 py-2 z-10"
                  style={{ background: b.ctaBg, boxShadow: `0 4px 16px ${b.ctaBg}55` }}
                >
                  <span className="text-white font-black text-sm sm:text-base leading-none">{b.promoTop}</span>
                  <span className="text-white/80 text-[8px] font-semibold leading-none mt-0.5 uppercase tracking-wide">{b.promoBot}</span>
                </div>
              </div>
            </div>

            {/* Dots */}
            <div className="flex items-center justify-center gap-2 py-3 bg-white">
              <button onClick={prev} className="opacity-30 hover:opacity-60 transition-opacity" style={{ color: b.color }} aria-label="Previous">
                <ChevronLeft size={15} />
              </button>
              {BANNERS.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`}
                  className="rounded-full transition-all duration-300"
                  style={{ width: i === current ? "22px" : "6px", height: "6px", background: i === current ? b.color : `${b.color}30` }}
                />
              ))}
              <button onClick={next} className="opacity-30 hover:opacity-60 transition-opacity" style={{ color: b.color }} aria-label="Next">
                <ChevronRight size={15} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
