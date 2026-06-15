"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Badge {
  emoji: string;
  title: string;
  desc: string;
  detail: string;
  call?: boolean;
}

const BADGES: Badge[] = [
  {
    emoji: "🛵",
    title: "Fast Delivery",
    desc: "15–40 min",
    detail:
      "Your food arrives hot and fresh in 15–40 minutes across the UAE. We work with reliable riders so your order reaches you quickly, every time.",
  },
  {
    emoji: "🛡️",
    title: "Safe & Secure",
    desc: "Payments",
    detail:
      "Every payment is processed through secure, encrypted channels. Your personal and payment details are protected and never shared with third parties.",
  },
  {
    emoji: "🌿",
    title: "Fresh",
    desc: "Ingredients",
    detail:
      "We cook with fresh, high-quality ingredients prepared daily by our chefs across all four restaurants — no shortcuts, just great food.",
  },
  {
    emoji: "🎧",
    title: "Live Support",
    desc: "24/7",
    detail: "Need help? Our team is available around the clock. Tap to call us now.",
    call: true,
  },
];

export default function TrustBadgesClient({ phone }: { phone: string }) {
  const [active, setActive] = useState<Badge | null>(null);
  const telHref = `tel:${phone.replace(/\s+/g, "")}`;

  return (
    <section className="py-5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-4 gap-3">
          {BADGES.map((b) =>
            b.call ? (
              <a
                key={b.title}
                href={telHref}
                className="flex flex-col items-center text-center rounded-2xl py-4 px-2 bg-white transition-transform hover:-translate-y-0.5 active:scale-95"
                style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
              >
                <span className="text-2xl sm:text-3xl mb-2">{b.emoji}</span>
                <p className="text-[11px] sm:text-xs font-bold text-gray-800 leading-tight">{b.title}</p>
                <p className="text-[9px] sm:text-[10px] text-gray-400 leading-tight mt-0.5">{b.desc}</p>
              </a>
            ) : (
              <button
                key={b.title}
                onClick={() => setActive(b)}
                className="flex flex-col items-center text-center rounded-2xl py-4 px-2 bg-white transition-transform hover:-translate-y-0.5 active:scale-95"
                style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
              >
                <span className="text-2xl sm:text-3xl mb-2">{b.emoji}</span>
                <p className="text-[11px] sm:text-xs font-bold text-gray-800 leading-tight">{b.title}</p>
                <p className="text-[9px] sm:text-[10px] text-gray-400 leading-tight mt-0.5">{b.desc}</p>
              </button>
            )
          )}
        </div>
      </div>

      {/* Detail popup */}
      {active && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
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
            <p className="text-[12px] font-semibold text-orange-500 uppercase tracking-wide mb-3">{active.desc}</p>
            <p className="text-[13px] text-gray-500 leading-relaxed">{active.detail}</p>

            <button
              onClick={() => setActive(null)}
              className="mt-5 w-full py-3 rounded-2xl text-white font-bold text-sm transition-opacity hover:opacity-90"
              style={{ background: "#ea580c" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
