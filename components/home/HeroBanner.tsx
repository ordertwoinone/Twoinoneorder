"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface Slide {
  id: number;
  tag: string;
  headlineOrange: string;
  headlineBlack: string;
  sub: string;
  cta: string;
  ctaHref: string;
  bg: string;
  accentColor: string;
  foodImage: string;
  foodAlt: string;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    tag: "FALAFEL AL NILE",
    headlineOrange: "20% EXTRA",
    headlineBlack: "DISCOUNT",
    sub: "Crispy falafel & shawarma\ndelivered hot to your door.",
    cta: "Order Now",
    ctaHref: "https://order.falafelalnile.com",
    bg: "#fff8f2",
    accentColor: "#ea580c",
    foodImage: "/hero/slide-1.png",
    foodAlt: "Falafel Al Nile — shawarma, falafel & fries",
  },
  {
    id: 2,
    tag: "TWO IN ONE",
    headlineOrange: "KARAK &",
    headlineBlack: "SNACK COMBO",
    sub: "Spiced karak chai, sandwiches\n& crispy samosas all day.",
    cta: "Order Now",
    ctaHref: "https://www.karaksnack.com",
    bg: "#fffaf2",
    accentColor: "#d97706",
    foodImage: "/hero/slide-2.png",
    foodAlt: "Karak tea with sandwich, samosas and fries",
  },
  {
    id: 3,
    tag: "MINI BOX",
    headlineOrange: "BURGER",
    headlineBlack: "FEAST DEAL",
    sub: "Double patty burgers, crispy\nnuggets & loaded fries.",
    cta: "Order Now",
    ctaHref: "https://www.miniboxae.com",
    bg: "#fff5f5",
    accentColor: "#dc2626",
    foodImage: "/hero/slide-3.png",
    foodAlt: "Double burger with nuggets and fries",
  },
  {
    id: 4,
    tag: "FALAFEL AL NILE",
    headlineOrange: "FREE",
    headlineBlack: "DELIVERY TODAY",
    sub: "On all orders above AED 30\nfrom our restaurants.",
    cta: "Order Now",
    ctaHref: "#restaurants",
    bg: "#f2fff8",
    accentColor: "#16a34a",
    foodImage: "/hero/slide-4.png",
    foodAlt: "Shawarma wrap with falafel and fries",
  },
];

const AUTOPLAY_MS = 4500;

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent((c) => (c + 1) % SLIDES.length), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, next]);

  const s = SLIDES[current];

  return (
    <section
      className="px-4 pt-3 pb-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-7xl mx-auto">
        <div
          className="rounded-3xl overflow-hidden relative"
          style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.08)" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={s.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-stretch"
              style={{
                background: s.bg,
                minHeight: "210px",
              }}
            >
              {/* LEFT: text */}
              <div className="flex flex-col justify-center px-5 sm:px-8 py-6 w-[56%] sm:w-[52%] z-10">
                {/* Brand pill */}
                <motion.span
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 }}
                  className="inline-block text-[10px] sm:text-[11px] font-extrabold px-3 py-1 rounded-full mb-3 w-fit tracking-wider"
                  style={{
                    color: s.accentColor,
                    border: `1.5px solid ${s.accentColor}`,
                    background: `${s.accentColor}10`,
                  }}
                >
                  {s.tag}
                </motion.span>

                {/* Headline */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="font-black leading-none mb-2"
                  style={{ fontSize: "clamp(22px, 5vw, 40px)" }}
                >
                  <span style={{ color: s.accentColor }}>{s.headlineOrange}</span>
                  <br />
                  <span className="text-gray-900">{s.headlineBlack}</span>
                </motion.h2>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  className="text-gray-500 leading-relaxed whitespace-pre-line mb-5"
                  style={{ fontSize: "clamp(10px, 2vw, 13px)" }}
                >
                  {s.sub}
                </motion.p>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24 }}
                >
                  <a
                    href={s.ctaHref}
                    target={s.ctaHref.startsWith("http") ? "_blank" : undefined}
                    rel={s.ctaHref.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-bold transition-all hover:gap-3 active:scale-95"
                    style={{
                      background: s.accentColor,
                      boxShadow: `0 4px 18px ${s.accentColor}50`,
                      fontSize: "clamp(11px, 2vw, 14px)",
                    }}
                  >
                    {s.cta}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </a>
                </motion.div>
              </div>

              {/* RIGHT: floating food PNG */}
              <div className="flex-1 relative overflow-visible">
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="absolute"
                  style={{
                    bottom: "-8px",
                    right: "-8px",
                    width: "115%",
                    height: "115%",
                  }}
                >
                  <Image
                    src={s.foodImage}
                    alt={s.foodAlt}
                    fill
                    className="object-contain object-right-bottom drop-shadow-2xl"
                    sizes="(max-width: 640px) 55vw, 45vw"
                    priority={s.id === 1}
                  />
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div
            className="flex items-center justify-center gap-2 py-3"
            style={{ background: s.bg }}
          >
            <button
              onClick={prev}
              className="opacity-30 hover:opacity-70 transition-opacity"
              aria-label="Previous"
              style={{ color: s.accentColor }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Slide ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === current ? "22px" : "6px",
                  height: "6px",
                  background: i === current ? s.accentColor : `${s.accentColor}35`,
                }}
              />
            ))}
            <button
              onClick={next}
              className="opacity-30 hover:opacity-70 transition-opacity"
              aria-label="Next"
              style={{ color: s.accentColor }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
