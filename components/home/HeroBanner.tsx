"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Banner {
  id: number;
  tag: string;
  headline: string;
  accent: string;
  subtext: string;
  cta: string;
  ctaHref: string;
  bg: string;
  glow: string;
  foodImage: string;
  foodAlt: string;
  promoText: string;
  promoSub: string;
}

const BANNERS: Banner[] = [
  {
    id: 1,
    tag: "Today's Special",
    headline: "FREE",
    accent: "DELIVERY",
    subtext: "On orders above AED 30 — karak, falafel, pastries & more.",
    cta: "ORDER NOW",
    ctaHref: "#restaurants",
    bg: "linear-gradient(135deg, #064e3b 0%, #065f46 55%, #047857 100%)",
    glow: "#34d399",
    foodImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
    foodAlt: "Delicious food spread",
    promoText: "AED 30",
    promoSub: "MIN ORDER",
  },
  {
    id: 2,
    tag: "Falafel Al Nile",
    headline: "CRISPY",
    accent: "FALAFEL",
    subtext: "Authentic Egyptian falafel & shawarma delivered fresh to your door.",
    cta: "ORDER FALAFEL",
    ctaHref: "https://order.falafelalnile.com",
    bg: "linear-gradient(135deg, #431407 0%, #7c2d12 55%, #9a3412 100%)",
    glow: "#fb923c",
    foodImage: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80",
    foodAlt: "Fresh falafel plate",
    promoText: "20%",
    promoSub: "OFF TODAY",
  },
  {
    id: 3,
    tag: "Karak & Snack",
    headline: "AUTHENTIC",
    accent: "KARAK",
    subtext: "Spiced karak chai, masala tea & street snacks delivered piping hot.",
    cta: "GET KARAK",
    ctaHref: "https://www.karaksnack.com",
    bg: "linear-gradient(135deg, #4c0519 0%, #881337 55%, #9f1239 100%)",
    glow: "#fb7185",
    foodImage: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&q=80",
    foodAlt: "Spiced karak tea",
    promoText: "HOT",
    promoSub: "DAILY BREW",
  },
  {
    id: 4,
    tag: "Catering Service",
    headline: "BOOK YOUR",
    accent: "EVENT",
    subtext: "Weddings, corporate & birthdays. Premium catering across UAE.",
    cta: "BOOK NOW",
    ctaHref: "/catering",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #1e40af 100%)",
    glow: "#60a5fa",
    foodImage: "https://images.unsplash.com/photo-1555244162-803834f70033?w=600&q=80",
    foodAlt: "Catering food spread",
    promoText: "5★",
    promoSub: "RATED",
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
    <section
      className="px-4 pt-3 pb-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={b.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.38, ease: "easeInOut" }}
            className="rounded-3xl overflow-hidden relative"
            style={{ background: b.bg }}
          >
            {/* Decorative orbs */}
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${b.glow}25 0%, transparent 70%)`,
                transform: "translate(25%, -25%)",
              }}
            />
            <div
              className="absolute bottom-0 left-1/4 w-40 h-40 rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${b.glow}15 0%, transparent 70%)`,
                transform: "translateY(50%)",
              }}
            />

            {/* Main content row */}
            <div className="relative flex items-center px-5 sm:px-8 py-5 sm:py-8 gap-3 sm:gap-8">
              {/* ── LEFT: text ── */}
              <div className="flex-1 min-w-0 z-10">
                {/* Tag pill */}
                <motion.div
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 }}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3 text-[10px] font-bold"
                  style={{
                    background: `${b.glow}22`,
                    color: b.glow,
                    border: `1px solid ${b.glow}40`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: b.glow }}
                  />
                  {b.tag}
                </motion.div>

                {/* Headline */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16 }}
                  className="mb-2"
                >
                  <p className="text-[24px] sm:text-[38px] font-black text-white/60 leading-none tracking-tight">
                    {b.headline}
                  </p>
                  <p
                    className="text-[30px] sm:text-[48px] font-black leading-none tracking-tight"
                    style={{ color: b.glow }}
                  >
                    {b.accent}
                  </p>
                </motion.div>

                {/* Subtext */}
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24 }}
                  className="text-[11px] sm:text-sm text-white/55 mb-4 leading-relaxed max-w-[185px] sm:max-w-xs"
                >
                  {b.subtext}
                </motion.p>

                {/* CTA button */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.31 }}
                >
                  <a
                    href={b.ctaHref}
                    target={b.ctaHref.startsWith("http") ? "_blank" : undefined}
                    rel={b.ctaHref.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] sm:text-sm font-bold transition-all hover:gap-3 active:scale-95 shadow-lg"
                    style={{ background: b.glow, color: "#fff" }}
                  >
                    {b.cta}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </a>
                </motion.div>
              </div>

              {/* ── RIGHT: circular food image with promo badge ── */}
              <div className="relative flex-shrink-0 w-[120px] h-[120px] sm:w-[190px] sm:h-[190px] z-10">
                {/* Glow halo */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, ${b.glow}35 0%, transparent 65%)`,
                    transform: "scale(1.4)",
                  }}
                />
                {/* Rotating dashed ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-dashed opacity-25"
                  style={{ borderColor: b.glow, transform: "scale(1.15)" }}
                />
                {/* Solid ring */}
                <div
                  className="absolute inset-0 rounded-full border-2 opacity-40"
                  style={{ borderColor: b.glow, transform: "scale(1.06)" }}
                />
                {/* Food image */}
                <div
                  className="relative w-full h-full rounded-full overflow-hidden border-[3px]"
                  style={{ borderColor: `${b.glow}70` }}
                >
                  <Image
                    src={b.foodImage}
                    alt={b.foodAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 120px, 190px"
                    priority={b.id === 1}
                  />
                </div>

                {/* Promo badge */}
                <div
                  className="absolute -top-1 -right-1 sm:top-0 sm:right-0 rounded-full flex flex-col items-center justify-center text-center shadow-xl"
                  style={{ width: "52px", height: "52px", background: b.glow }}
                >
                  <span className="text-[12px] sm:text-[13px] font-black text-white leading-none">
                    {b.promoText}
                  </span>
                  <span className="text-[7px] font-bold text-white/90 leading-none mt-0.5">
                    {b.promoSub}
                  </span>
                </div>
              </div>
            </div>

            {/* Dots + arrows */}
            <div className="relative flex items-center justify-center gap-2.5 pb-3 sm:pb-4">
              <button
                onClick={prev}
                className="opacity-40 hover:opacity-80 transition-opacity rounded-full p-0.5"
                style={{ color: b.glow }}
                aria-label="Previous slide"
              >
                <ChevronLeft size={15} />
              </button>
              {BANNERS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  aria-label={`Slide ${i + 1}`}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === current ? "22px" : "6px",
                    height: "6px",
                    background: i === current ? b.glow : `${b.glow}40`,
                  }}
                />
              ))}
              <button
                onClick={next}
                className="opacity-40 hover:opacity-80 transition-opacity rounded-full p-0.5"
                style={{ color: b.glow }}
                aria-label="Next slide"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
