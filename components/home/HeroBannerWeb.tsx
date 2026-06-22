"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { BannerSlide } from "./HeroBanner";

const AUTOPLAY_MS = 4500;

// Desktop/web hero — the original slideshow design (text panel + food image).
export default function HeroBannerWeb({ slides }: { slides: BannerSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, next, slides.length]);

  if (!slides.length) return null;

  const s = slides[current];
  const href = s.cta_href || "#";
  const external = /^https?:\/\//.test(href);

  return (
    <section
      className="px-4 pt-3 pb-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-7xl mx-auto">
        <div className="rounded-3xl overflow-hidden relative" style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.08)" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={s.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-stretch min-h-[240px] lg:min-h-[300px]"
              style={{ background: s.bg_color }}
            >
              {/* LEFT: text */}
              <div className="flex flex-col justify-center px-8 py-8 w-[50%] z-10">
                <motion.span
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 }}
                  className="inline-block text-[11px] font-extrabold px-3 py-1 rounded-full mb-3 w-fit tracking-wider"
                  style={{ color: s.accent_color, border: `1.5px solid ${s.accent_color}`, background: `${s.accent_color}10` }}
                >
                  {s.tag}
                </motion.span>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="font-black leading-none mb-2"
                  style={{ fontSize: "clamp(28px, 3vw, 44px)" }}
                >
                  <span style={{ color: s.accent_color }}>{s.headline_orange}</span>
                  <br />
                  <span className="text-gray-900">{s.headline_black}</span>
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  className="text-gray-500 leading-relaxed whitespace-pre-line mb-5 line-clamp-3"
                  style={{ fontSize: "clamp(12px, 1vw, 15px)" }}
                >
                  {s.subtitle?.replace(/\\n/g, "\n")}
                </motion.p>

                {(s.cta_text || s.cta_href) && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
                    {external ? (
                      <a
                        href={href}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold transition-all hover:gap-3 active:scale-95"
                        style={{ background: s.accent_color, boxShadow: `0 4px 18px ${s.accent_color}50`, fontSize: "14px" }}
                      >
                        {s.cta_text || "Order Now"}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </a>
                    ) : (
                      <Link
                        href={href}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold transition-all hover:gap-3 active:scale-95"
                        style={{ background: s.accent_color, boxShadow: `0 4px 18px ${s.accent_color}50`, fontSize: "14px" }}
                      >
                        {s.cta_text || "Order Now"}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
                  </motion.div>
                )}
              </div>

              {/* RIGHT: food image */}
              <div className="flex-1 relative overflow-hidden">
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="w-full h-full"
                  >
                    <Image
                      src={s.food_image_url}
                      alt={s.food_alt || s.tag}
                      fill
                      className="object-contain object-center"
                      sizes="45vw"
                      priority={current === 0}
                    />
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 py-3" style={{ background: s.bg_color }}>
            <button onClick={prev} aria-label="Previous" className="opacity-30 hover:opacity-70 transition-opacity" style={{ color: s.accent_color }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{ width: i === current ? "22px" : "6px", height: "6px", background: i === current ? s.accent_color : `${s.accent_color}35` }}
              />
            ))}
            <button onClick={next} aria-label="Next" className="opacity-30 hover:opacity-70 transition-opacity" style={{ color: s.accent_color }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
