"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu, X, ChevronRight, MapPin,
  Heart, Navigation, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "@/hooks/useLocation";
import { useFavorites } from "@/lib/favorites/FavoritesContext";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Restaurants", href: "/#restaurants" },
  { label: "Offers", href: "/offers" },
  { label: "Book a Table", href: "/book-table" },
  { label: "Catering", href: "/catering" },
  { label: "University Kalba", href: "/restaurant/university-kalba" },
  { label: "Buffet Menu", href: "/restaurant/buffet" },
  { label: "My Account", href: "/account" },
];

export default function Navbar({ className = "" }: { className?: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { location, detect } = useLocation();
  const { keys: favKeys } = useFavorites();
  const favCount = favKeys.size;

  const displayArea =
    location.status === "granted" ? location.area : "Use my location";

  return (
    <>
      <nav className={`sticky top-0 z-50 bg-white border-b border-gray-100${className ? ` ${className}` : ""}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3">

          {/* Hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white hover:bg-gray-50 transition-colors shrink-0 border border-gray-100"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
            aria-label="Menu"
          >
            <Menu size={20} className="text-gray-700" />
          </button>

          {/* Logo + Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="relative w-10 h-10 shrink-0">
              <Image
                src="/logos/two-in-one.png"
                alt="Two In One"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <p className="text-[13px] font-extrabold text-gray-900 leading-tight tracking-wide uppercase">
                Two In One
              </p>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">
                4 Restaurants. One Destination.
              </p>
            </div>
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Location — tap to use current location */}
          <button
            onClick={detect}
            disabled={location.status === "loading"}
            aria-label="Use my current location"
            className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-colors disabled:cursor-default"
          >
            <MapPin size={17} fill="#ea580c" stroke="none" />
            {location.status === "loading" ? (
              <Loader2 size={14} className="animate-spin" style={{ color: "#ea580c" }} />
            ) : (
              <span className="text-[13px] font-semibold text-gray-800 max-w-[120px] truncate block">
                {displayArea}
              </span>
            )}
            {location.status !== "loading" && location.status !== "granted" && (
              <Navigation size={13} style={{ color: "#ea580c" }} />
            )}
          </button>

          {/* Favourites */}
          <Link
            href="/account/favourites"
            aria-label="Favourites"
            className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors shrink-0"
          >
            <Heart size={20} className={favCount > 0 ? "fill-red-500 stroke-red-500" : "text-gray-700"} />
            {favCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-[9px] font-bold text-white flex items-center justify-center rounded-full"
                style={{ background: "#ea580c" }}
              >
                {favCount}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* Slide-in drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-9 h-9 shrink-0">
                    <Image src="/logos/two-in-one.png" alt="Two In One" fill className="object-contain" />
                  </div>
                  <span className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">Two In One</span>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 py-4 overflow-y-auto">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-5 py-3.5 text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors text-sm font-medium"
                  >
                    {l.label}
                    <ChevronRight size={16} className="text-gray-300" />
                  </Link>
                ))}
              </div>
              <div className="p-5 border-t border-gray-100">
                <Link
                  href="/catering"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full text-white text-sm font-bold py-3 rounded-2xl text-center block transition-colors"
                  style={{ background: "#ea580c" }}
                >
                  Book Catering
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
