"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, ArrowRight, Tag, ChevronLeft, ChevronRight } from "lucide-react";

export interface BuffetItem {
  id: string;
  name: string;
  cuisine: string;
  price: number;
  rating: number;
  image_url: string;
  href: string;
}

export default function BuffetSlideCard({ items }: { items: BuffetItem[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (dir: number) => setIdx((p) => (p + dir + items.length) % items.length),
    [items.length]
  );

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % items.length), 3000);
    return () => clearInterval(t);
  }, [items.length, paused]);

  if (!items.length) return null;
  const b = items[idx];
  const multi = items.length > 1;

  return (
    <div
      className="relative flex flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Link href={b.href} className="flex flex-col h-full">
        <div
          className="group rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 overflow-hidden flex flex-col h-full"
          style={{ background: "linear-gradient(150deg,#f97316 0%,#ea580c 60%,#c2410c 100%)" }}
        >

          {/* Slideshow image */}
          <div className="mx-2 mt-2 sm:mx-3 sm:mt-3 rounded-2xl overflow-hidden flex-shrink-0 relative min-h-[112px] sm:min-h-[160px]">
            <div key={b.id} className="hc-fade relative w-full h-full min-h-[112px] sm:min-h-[160px]">
              {b.image_url ? (
                <Image
                  src={b.image_url}
                  alt={b.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 45vw, 25vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl sm:text-6xl bg-orange-50 min-h-[112px] sm:min-h-[160px]">🍽️</div>
              )}
            </div>

            {/* Label */}
            <span className="absolute top-3 left-3 text-[10px] font-extrabold px-2.5 py-1 rounded-full leading-none z-10 bg-white text-orange-600 shadow-sm">
              🔥 Buffet Highlights
            </span>

            {/* Slide counter */}
            {multi && (
              <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full bg-black/45 text-white leading-none z-10">
                {idx + 1}/{items.length}
              </span>
            )}

            {/* Dots */}
            {multi && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                {items.map((_, i) => (
                  <span
                    key={i}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === idx ? 16 : 5,
                      height: 5,
                      background: i === idx ? "#fff" : "rgba(255,255,255,0.6)",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-3 pt-2.5 pb-3 sm:px-4 sm:pt-3 sm:pb-4 flex flex-col flex-1 gap-1 sm:gap-1.5">
            <div key={`${b.id}-info`} className="hc-fade flex flex-col gap-1 sm:gap-1.5 flex-1">
              <h3 className="font-extrabold text-white text-[13px] sm:text-base leading-tight truncate">{b.name}</h3>
              <p className="text-orange-100 text-[11px] sm:text-[13px] leading-relaxed truncate">{b.cuisine}</p>

              <div className="flex items-center gap-2 sm:gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-[11px] sm:text-[12px] text-orange-50 font-medium">
                  <Tag size={11} className="text-orange-200" />
                  from <strong className="text-white">AED {b.price}</strong>
                </span>
                <span className="flex items-center gap-1 text-[11px] sm:text-[12px] text-orange-50 font-medium">
                  <Star size={11} className="fill-yellow-300 stroke-yellow-300" />
                  <strong className="text-white">{b.rating}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center mt-auto pt-2.5 sm:pt-3">
              <div className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-1.5 rounded-full text-[12px] sm:text-[13px] font-bold bg-white text-orange-600 transition-all duration-200 group-hover:gap-2.5 shadow-sm">
                Book Now
                <ArrowRight size={13} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Prev / Next arrows — siblings of the link, overlaid on the image */}
      {multi && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(-1)}
            className="absolute left-4 sm:left-5 top-[64px] sm:top-[92px] -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 shadow-md border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-white hover:scale-110 active:scale-95 transition-all"
          >
            <ChevronLeft size={17} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(1)}
            className="absolute right-4 sm:right-5 top-[64px] sm:top-[92px] -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 shadow-md border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-white hover:scale-110 active:scale-95 transition-all"
          >
            <ChevronRight size={17} strokeWidth={2.5} />
          </button>
        </>
      )}
    </div>
  );
}
