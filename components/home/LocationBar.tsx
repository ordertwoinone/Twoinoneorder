"use client";
import { useState } from "react";
import { MapPin, ChevronDown, Loader2, Navigation } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "@/hooks/useLocation";

const UAE_AREAS = [
  "Al Karama, Dubai",
  "Deira, Dubai",
  "Jumeirah, Dubai",
  "Business Bay, Dubai",
  "Dubai Marina, Dubai",
  "Downtown Dubai",
  "Al Nahda, Sharjah",
  "Abu Dhabi City",
  "Al Ain",
  "Ajman City",
  "Kalba, Fujairah",
  "Ras Al Khaimah",
];

export default function LocationBar() {
  const { location, detect } = useLocation();
  const [manual, setManual] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const displayArea =
    location.status === "granted"
      ? location.area
      : manual || "Select your area";

  const isGranted = location.status === "granted";

  return (
    <div className="bg-white px-4 pt-3 pb-2">
      <div className="max-w-7xl mx-auto">
        <div
          className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm cursor-pointer hover:border-green-400 transition-colors"
          onClick={() => !isGranted && setShowDropdown(!showDropdown)}
        >
          <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <MapPin size={17} className="text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            {location.status === "loading" ? (
              <div className="flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-green-600" />
                <span className="text-sm text-gray-500">Detecting location...</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 leading-none mb-0.5">Delivering to</p>
                <p className="text-sm font-bold text-gray-900 truncate">{displayArea}</p>
              </>
            )}
          </div>
          {!isGranted && location.status !== "loading" && (
            <ChevronDown size={16} className="text-gray-400 shrink-0" />
          )}
          {location.status === "denied" && (
            <button
              onClick={(e) => { e.stopPropagation(); detect(); }}
              className="flex items-center gap-1 text-xs text-green-600 font-semibold hover:text-green-700 shrink-0"
            >
              <Navigation size={12} />
              Detect
            </button>
          )}
        </div>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-40 absolute left-4 right-4 max-w-7xl"
            >
              {UAE_AREAS.map((area) => (
                <button
                  key={area}
                  onClick={() => { setManual(area); setShowDropdown(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors text-left"
                >
                  <MapPin size={13} className="text-gray-400" />
                  {area}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
