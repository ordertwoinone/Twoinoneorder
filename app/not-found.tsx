import Link from "next/link";
import Image from "next/image";
import { Home, UtensilsCrossed, CalendarCheck, Tag } from "lucide-react";

export const metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

const QUICK_LINKS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Buffet", href: "/restaurant/buffet", icon: UtensilsCrossed },
  { label: "Book a Table", href: "/book-table", icon: CalendarCheck },
  { label: "Offers", href: "/offers", icon: Tag },
];

// Decorative floating food — pure ambience.
const FOODIES = [
  { e: "🍔", cls: "top-[12%] left-[10%] text-5xl food-bubble" },
  { e: "🥤", cls: "top-[20%] right-[12%] text-4xl food-bubble-alt" },
  { e: "🧆", cls: "bottom-[22%] left-[14%] text-4xl food-bubble-alt" },
  { e: "🍩", cls: "bottom-[16%] right-[10%] text-5xl food-bubble" },
  { e: "☕", cls: "top-[42%] left-[6%] text-3xl food-bubble" },
  { e: "🥪", cls: "top-[38%] right-[7%] text-3xl food-bubble-alt" },
];

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-5 py-16 text-center">
      {/* Warm restaurant gradient backdrop */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(160deg, #fff7ed 0%, #ffedd5 45%, #fee2e2 100%)" }}
      />
      {/* Soft glow */}
      <div
        className="absolute left-1/2 top-1/3 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-3xl opacity-50"
        style={{ background: "radial-gradient(circle, #fdba74 0%, transparent 70%)" }}
      />

      {/* Floating food (hidden on small screens to avoid clutter) */}
      {FOODIES.map((f, i) => (
        <span key={i} aria-hidden className={`pointer-events-none absolute select-none hidden sm:block ${f.cls}`}>
          {f.e}
        </span>
      ))}

      {/* Brand */}
      <Link href="/" className="mb-8 inline-flex items-center gap-2">
        <Image src="/logos/two-in-one.png" alt="Two In One" width={40} height={40} className="object-contain" />
        <span className="text-lg font-bold text-gray-800">Two In One</span>
      </Link>

      {/* The "empty plate" */}
      <div className="relative mb-7 h-56 w-56 sm:h-64 sm:w-64">
        {/* Spinning dashed ring */}
        <div className="orbit-ring-spin absolute inset-0 rounded-full border-[3px] border-dashed border-orange-300/70" />
        <div className="orbit-ring-spin-rev absolute inset-4 rounded-full border-2 border-dashed border-red-200" />
        {/* Plate */}
        <div className="center-pulse absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white shadow-xl">
          <span
            className="text-6xl sm:text-7xl font-extrabold leading-none"
            style={{ background: "linear-gradient(135deg, #ea580c, #dc2626)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
          >
            404
          </span>
          <span className="mt-1 text-3xl">🍽️</span>
        </div>
      </div>

      {/* Headline */}
      <h1
        className="text-4xl sm:text-5xl text-orange-600"
        style={{ fontFamily: "var(--font-dancing)" }}
      >
        Oops! This dish isn&apos;t on the menu
      </h1>
      <p className="mt-3 max-w-md text-sm sm:text-base text-gray-600">
        The page you&apos;re craving has been taken off the table — or maybe it never made it to the kitchen.
        Let&apos;s get you back to something delicious.
      </p>

      {/* Primary CTA */}
      <Link
        href="/"
        className="mt-7 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-transform hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #f97316, #dc2626)" }}
      >
        <Home size={17} />
        Back to Home
      </Link>

      {/* Quick links */}
      <div className="mt-10 w-full max-w-md">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Or jump to</p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/70 px-4 py-2 text-sm font-semibold text-gray-700 backdrop-blur-sm transition-colors hover:border-orange-400 hover:text-orange-600"
            >
              <Icon size={15} className="text-orange-500" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
