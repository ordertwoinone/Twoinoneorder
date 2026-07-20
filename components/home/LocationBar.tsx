"use client";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { useLocation } from "@/hooks/useLocation";

export default function LocationBar() {
  const { location, detect } = useLocation();

  const displayArea =
    location.status === "granted" ? location.area : "Use my current location";

  const subLabel =
    location.status === "granted"
      ? "Delivering to"
      : location.status === "denied" || location.status === "error"
        ? "Location access needed"
        : "Tap to detect";

  return (
    <div className="px-4 pt-3 pb-2">
      <div className="max-w-7xl mx-auto">
        {/* ── Location bar — tap to use current location ── */}
        <button
          onClick={detect}
          disabled={location.status === "loading"}
          className="w-full flex items-center gap-3 bg-gray-50 border border-gray-100 hover:border-green-200 rounded-2xl px-4 py-3 transition-all text-left disabled:cursor-default"
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
                <p className="text-[10px] text-gray-400 leading-none mb-0.5">{subLabel}</p>
                <p className="text-sm font-bold text-gray-900 truncate">{displayArea}</p>
              </>
            )}
          </div>

          {/* Use my current location button */}
          {location.status !== "loading" && (
            <span className="flex items-center gap-1.5 text-[11px] text-green-600 font-semibold bg-green-50 px-2.5 py-1.5 rounded-lg shrink-0">
              <Navigation size={12} />
              {location.status === "granted" ? "Update" : "Use location"}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
