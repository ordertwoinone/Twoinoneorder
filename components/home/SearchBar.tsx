"use client";
import { useRef, useEffect, useState } from "react";
import { Search, X, ExternalLink, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useSearch } from "@/hooks/useSearch";
import { useTranslation } from "@/lib/i18n/useTranslation";

/* The placeholder cycles through search.terms one at a time instead of listing
   them all in a comma-separated line — one dish reads far better at a glance. */
const TERM_MS = 2200;

const RESTAURANT_COLORS: Record<string, string> = {
  "Two In One":     "bg-orange-600 text-white",
  "Karak & Snack":  "bg-red-600 text-white",
  "Falafel Al Nile":"bg-orange-500 text-white",
  "Mini Box":        "bg-amber-400 text-white",
};

export default function SearchBar() {
  const { query, results, isOpen, setIsOpen, handleChange, clear } = useSearch();
  const { t, tp, tList } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [termIndex, setTermIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  const terms = tList("search.terms");

  // Rotate the placeholder word, but hold still while there's a query — the
  // hint is irrelevant once someone is typing.
  useEffect(() => {
    if (query || terms.length < 2) return;
    const id = setInterval(() => setTermIndex((i) => (i + 1) % terms.length), TERM_MS);
    return () => clearInterval(id);
  }, [query, terms.length]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setIsOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setIsOpen]);

  return (
    <div className="py-3">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-3">

        {/* Search pill */}
        <div className="flex-1 relative" ref={containerRef}>
          <Search
            size={20}
            className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            aria-label={t("search.label")}
            placeholder=""
            className="w-full ps-12 pe-12 py-4 rounded-[20px] bg-white text-[15px] text-gray-700 placeholder:text-gray-400 focus:outline-none ring-1 ring-black/[0.06] focus:ring-orange-300 shadow-[0_6px_22px_rgba(0,0,0,0.10)] transition-shadow"
            onFocus={() => { if (query.trim().length >= 2) setIsOpen(true); }}
          />

          {/* Animated stand-in for the placeholder — a native one can't
              animate, so the input's is left empty and this sits in its
              place. Purely decorative: it never swallows a tap. */}
          {!query && (
            <div
              className="absolute start-12 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[15px] text-gray-400 pointer-events-none select-none"
              aria-hidden="true"
            >
              <span>{t("search.prefix")}</span>
              <span className="relative block h-[22px] leading-[22px] overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={terms[termIndex % Math.max(terms.length, 1)]}
                    initial={reduceMotion ? { opacity: 0 } : { y: 22, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { y: -22, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="block whitespace-nowrap"
                  >
                    {terms[termIndex % Math.max(terms.length, 1)]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </div>
          )}
          {query ? (
            <button
              onClick={clear}
              aria-label={t("search.clear")}
              className="absolute end-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 z-10"
            >
              <X size={16} />
            </button>
          ) : (
            <span
              className="absolute end-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 z-10 pointer-events-none"
              aria-hidden="true"
            >
              <SlidersHorizontal size={17} />
            </span>
          )}

          {/* Dropdown results */}
          <AnimatePresence>
            {isOpen && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-100 overflow-hidden z-50"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}
              >
                <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100">
                  {tp("common.results", results.length)}
                </div>
                {results.map((item) => (
                  <a
                    key={item.id}
                    href={item.restaurantUrl}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors group"
                    onClick={clear}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-orange-700">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {item.category} · {item.restaurantName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.price && (
                        <span className="text-xs font-bold text-orange-600">
                          {t("common.price", { amount: item.price })}
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${RESTAURANT_COLORS[item.restaurantName] || "bg-gray-200 text-gray-600"}`}>
                        {item.restaurantName.split(" ")[0]}
                      </span>
                      <ExternalLink size={11} className="text-gray-300" />
                    </div>
                  </a>
                ))}
              </motion.div>
            )}
            {isOpen && query.trim().length >= 2 && results.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-100 px-4 py-5 text-center z-50"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}
              >
                <p className="text-sm text-gray-500">{t("search.noResults", { query })}</p>
                <p className="text-xs text-gray-400 mt-1">{t("search.hint")}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
