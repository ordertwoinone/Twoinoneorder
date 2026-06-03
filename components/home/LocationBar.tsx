"use client";
import { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown, Loader2, Navigation, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "@/hooks/useLocation";

const UAE_AREAS = [
  "Al Karama, Dubai",
  "Deira, Dubai",
  "Jumeirah, Dubai",
  "Business Bay, Dubai",
  "Dubai Marina, Dubai",
  "Downtown Dubai",
  "Bur Dubai, Dubai",
  "Al Barsha, Dubai",
  "Al Quoz, Dubai",
  "Mirdif, Dubai",
  "Al Nahda, Dubai",
  "Al Nahda, Sharjah",
  "Al Majaz, Sharjah",
  "Al Qasimia, Sharjah",
  "Abu Dhabi City",
  "Al Ain",
  "Ajman City",
  "Ras Al Khaimah",
  "Fujairah City",
  "Kalba, Fujairah",
  "Umm Al Quwain",
];

export default function LocationBar() {
  const { location, detect } = useLocation();
  const [selected, setSelected] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const displayArea =
    location.status === "granted" ? location.area : selected || "Select delivery area";

  const filtered = UAE_AREAS.filter((a) =>
    a.toLowerCase().includes(query.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 80);
    } else {
      setQuery("");
    }
  }, [open]);

  return (
    <div className="px-4 pt-3 pb-2" ref={containerRef}>
      <div className="max-w-7xl mx-auto relative">
        {/* ── Trigger bar ── */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-3 bg-gray-50 border border-gray-100 hover:border-green-200 rounded-2xl px-4 py-3 transition-all text-left"
        >
          {/* Pin icon */}
          <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <MapPin size={17} className="text-green-600" />
          </div>

          {/* Label */}
          <div className="flex-1 min-w-0">
            {location.status === "loading" ? (
              <div className="flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-green-600" />
                <span className="text-sm text-gray-500">Detecting location…</span>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-gray-400 leading-none mb-0.5">Delivering to</p>
                <p className="text-sm font-bold text-gray-900 truncate">{displayArea}</p>
              </>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {location.status === "denied" && (
              <button
                onClick={(e) => { e.stopPropagation(); detect(); }}
                className="flex items-center gap-1 text-[11px] text-green-600 font-semibold hover:text-green-700 bg-green-50 px-2 py-1 rounded-lg"
              >
                <Navigation size={11} />
                Detect
              </button>
            )}
            {/* Down arrow — always visible */}
            <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={17} className="text-gray-400" />
            </motion.div>
          </div>
        </button>

        {/* ── Dropdown ── */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl overflow-hidden z-50"
              style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}
            >
              {/* Search input inside dropdown */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search area or city…"
                    className="w-full pl-9 pr-8 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-green-400 focus:bg-white transition-all placeholder:text-gray-400"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Area list */}
              <div className="overflow-y-auto max-h-52">
                {filtered.length > 0 ? (
                  filtered.map((area) => (
                    <button
                      key={area}
                      onClick={() => { setSelected(area); setOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors hover:bg-green-50 hover:text-green-700 ${
                        (selected === area || (location.status === "granted" && location.area === area))
                          ? "bg-green-50 text-green-700 font-semibold"
                          : "text-gray-700"
                      }`}
                    >
                      <MapPin size={13} className="text-gray-300 shrink-0" />
                      {area}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-5 text-center">
                    <p className="text-sm text-gray-400">No areas found for &quot;{query}&quot;</p>
                    <p className="text-xs text-gray-300 mt-1">Try: Dubai, Sharjah, Abu Dhabi</p>
                  </div>
                )}
              </div>

              {/* Use my location option */}
              <div className="border-t border-gray-100 p-2">
                <button
                  onClick={() => { detect(); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-green-600 hover:bg-green-50 transition-colors text-sm font-semibold"
                >
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Navigation size={13} className="text-green-600" />
                  </div>
                  Use my current location
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
