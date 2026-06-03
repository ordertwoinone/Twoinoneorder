"use client";
import { useRef, useEffect } from "react";
import { Search, X, ExternalLink, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearch } from "@/hooks/useSearch";

const RESTAURANT_COLORS: Record<string, string> = {
  "Two In One": "bg-green-600 text-white",
  "Karak & Snack": "bg-red-600 text-white",
  "Falafel Al Nile": "bg-orange-500 text-white",
  "Mini Box": "bg-amber-400 text-white",
};

export default function SearchBar() {
  const { query, results, isOpen, setIsOpen, handleChange, clear } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setIsOpen]);

  return (
    <div className="bg-white px-4 pb-3 pt-1">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {/* Search input */}
        <div className="flex-1 relative" ref={containerRef}>
          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
            placeholder="Search for food, restaurants..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-gray-100 border-2 border-transparent focus:border-green-400 focus:bg-white focus:outline-none text-sm transition-all placeholder:text-gray-400"
          />
          {query && (
            <button
              onClick={clear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
            >
              <X size={15} />
            </button>
          )}

          <AnimatePresence>
            {isOpen && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
              >
                <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-50 bg-gray-50">
                  {results.length} result{results.length !== 1 ? "s" : ""} found
                </div>
                {results.map((item) => (
                  <a
                    key={item.id}
                    href={item.restaurantUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors group"
                    onClick={clear}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-green-700">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {item.category} · {item.restaurantName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.price && (
                        <span className="text-xs font-bold text-green-600">AED {item.price}</span>
                      )}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          RESTAURANT_COLORS[item.restaurantName] || "bg-gray-200 text-gray-600"
                        }`}
                      >
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
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-5 text-center z-50"
              >
                <p className="text-sm text-gray-500">No results for &quot;{query}&quot;</p>
                <p className="text-xs text-gray-400 mt-1">Try: karak, falafel, croissant</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filter button */}
        <button className="w-12 h-12 flex items-center justify-center bg-green-600 hover:bg-green-700 rounded-2xl text-white transition-colors shadow-sm shrink-0">
          <SlidersHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}
