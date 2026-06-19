"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export interface Badge {
  emoji: string;
  title: string;
  subtitle: string;
  detail: string;
  is_call?: boolean;
}

export default function TrustBadgesClient({ phone, badges }: { phone: string; badges: Badge[] }) {
  const [active, setActive] = useState<Badge | null>(null);
  const [mounted, setMounted] = useState(false);
  const telHref = `tel:${phone.replace(/\s+/g, "")}`;

  useEffect(() => setMounted(true), []);

  return (
    <section className="py-5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-3">
          {badges.map((b) =>
            b.is_call ? (
              <a
                key={b.title}
                href={telHref}
                className="flex flex-col items-center text-center rounded-2xl py-4 px-2 bg-white transition-transform hover:-translate-y-0.5 active:scale-95 w-[calc(50%-0.375rem)] sm:w-44"
                style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
              >
                <span className="text-2xl sm:text-3xl mb-2">{b.emoji}</span>
                <p className="text-[11px] sm:text-xs font-bold text-gray-800 leading-tight">{b.title}</p>
                <p className="text-[9px] sm:text-[10px] text-gray-400 leading-tight mt-0.5">{b.subtitle}</p>
              </a>
            ) : (
              <button
                key={b.title}
                onClick={() => setActive(b)}
                className="flex flex-col items-center text-center rounded-2xl py-4 px-2 bg-white transition-transform hover:-translate-y-0.5 active:scale-95 w-[calc(50%-0.375rem)] sm:w-44"
                style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
              >
                <span className="text-2xl sm:text-3xl mb-2">{b.emoji}</span>
                <p className="text-[11px] sm:text-xs font-bold text-gray-800 leading-tight">{b.title}</p>
                <p className="text-[9px] sm:text-[10px] text-gray-400 leading-tight mt-0.5">{b.subtitle}</p>
              </button>
            )
          )}
        </div>
      </div>

      {/* Detail popup — portaled to body so it escapes the section's transform */}
      {active && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActive(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center text-4xl mb-4">
              {active.emoji}
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">{active.title}</h3>
            <p className="text-[12px] font-semibold text-orange-500 uppercase tracking-wide mb-3">{active.subtitle}</p>
            <p className="text-[13px] text-gray-500 leading-relaxed">{active.detail}</p>

            <button
              onClick={() => setActive(null)}
              className="mt-5 w-full py-3 rounded-2xl text-white font-bold text-sm transition-opacity hover:opacity-90"
              style={{ background: "#ea580c" }}
            >
              Got it
            </button>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
