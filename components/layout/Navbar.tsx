"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu, X, ChevronRight, MapPin, ChevronDown,
  Bell, Navigation, Search, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "@/hooks/useLocation";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Restaurants", href: "#restaurants" },
  { label: "Offers", href: "#offers" },
  { label: "Catering", href: "/catering" },
];

const UAE_AREAS = [
  "Al Karama, Dubai", "Deira, Dubai", "Jumeirah, Dubai",
  "Business Bay, Dubai", "Dubai Marina, Dubai", "Downtown Dubai",
  "Bur Dubai, Dubai", "Al Barsha, Dubai", "Al Quoz, Dubai",
  "Mirdif, Dubai", "Al Nahda, Dubai", "Al Nahda, Sharjah",
  "Al Majaz, Sharjah", "Al Qasimia, Sharjah", "Abu Dhabi City",
  "Al Ain", "Ajman City", "Ras Al Khaimah", "Fujairah City",
  "Kalba, Fujairah", "Umm Al Quwain",
];

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const { location, detect } = useLocation();
  const locRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const displayArea =
    selected || (location.status === "granted" ? location.area : "Select area");

  const filtered = UAE_AREAS.filter((a) =>
    a.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (locRef.current && !locRef.current.contains(e.target as Node))
        setLocOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (locOpen) setTimeout(() => searchRef.current?.focus(), 80);
    else setQuery("");
  }, [locOpen]);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
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

          {/* Location */}
          <div ref={locRef} className="relative">
            <button
              onClick={() => setLocOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <MapPin size={17} fill="#ea580c" stroke="none" />
              <div className="text-left">
                {location.status === "loading" ? (
                  <Loader2 size={12} className="animate-spin" style={{ color: "#ea580c" }} />
                ) : (
                  <span className="text-[13px] font-semibold text-gray-800 max-w-[100px] truncate block">
                    {displayArea}
                  </span>
                )}
              </div>
              <motion.div animate={{ rotate: locOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={14} className="text-gray-500" />
              </motion.div>
            </button>

            {/* Location dropdown */}
            <AnimatePresence>
              {locOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl overflow-hidden z-50 border border-gray-100"
                  style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}
                >
                  <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        ref={searchRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search area or city…"
                        className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-52">
                    {filtered.length > 0 ? filtered.map((area) => (
                      <button
                        key={area}
                        onClick={() => { setSelected(area); setLocOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors hover:bg-orange-50 hover:text-orange-700 ${
                          selected === area || (location.status === "granted" && location.area === area)
                            ? "bg-orange-50 text-orange-700 font-semibold"
                            : "text-gray-700"
                        }`}
                      >
                        <MapPin size={13} className="text-gray-300 shrink-0" />
                        {area}
                      </button>
                    )) : (
                      <div className="px-4 py-5 text-center">
                        <p className="text-sm text-gray-400">No areas found for &quot;{query}&quot;</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-100 p-2">
                    <button
                      onClick={() => { setSelected(""); detect(); setLocOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-orange-50 transition-colors text-sm font-semibold"
                      style={{ color: "#ea580c" }}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "#fff7ed" }}>
                        <Navigation size={13} style={{ color: "#ea580c" }} />
                      </div>
                      Use my current location
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bell */}
          <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors shrink-0">
            <Bell size={20} className="text-gray-700" />
            <span
              className="absolute top-1 right-1 w-4 h-4 text-[9px] font-bold text-white flex items-center justify-center rounded-full"
              style={{ background: "#ea580c" }}
            >
              3
            </span>
          </button>
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
