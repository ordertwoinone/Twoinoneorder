"use client";
import { MapPin, Loader2, Navigation, ChevronDown } from "lucide-react";
import { useLocation } from "@/hooks/useLocation";

export default function LocationBar() {
  const { location, detect } = useLocation();

  const displayArea =
    location.status === "granted" ? location.area : "Set your location";

  return (
    <div className="sm:hidden px-4 pt-2.5 pb-1">
      <div className="flex items-center justify-between gap-3">
        {/* Deliver to — tap to detect */}
        <button
          onClick={detect}
          disabled={location.status === "loading"}
          className="flex items-center gap-2 text-left min-w-0 disabled:cursor-default"
          aria-label="Set delivery location"
        >
          <MapPin size={18} fill="#ea580c" stroke="#ea580c" className="shrink-0" />
          <span className="min-w-0">
            <span className="block text-[11px] text-gray-400 leading-none mb-0.5">
              Deliver to
            </span>
            {location.status === "loading" ? (
              <span className="flex items-center gap-1.5 text-[15px] font-bold text-gray-500">
                <Loader2 size={13} className="animate-spin" style={{ color: "#ea580c" }} />
                Detecting…
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[15px] font-bold text-gray-900">
                <span className="truncate max-w-[190px]">{displayArea}</span>
                <ChevronDown size={15} className="text-gray-500 shrink-0" />
              </span>
            )}
          </span>
        </button>

        {/* Change button */}
        <button
          onClick={detect}
          disabled={location.status === "loading"}
          className="flex items-center gap-1.5 border border-gray-200 rounded-full px-3.5 py-2 text-[13px] font-semibold text-gray-800 shrink-0 hover:bg-gray-50 transition-colors disabled:cursor-default"
        >
          <Navigation size={14} style={{ color: "#ea580c" }} />
          Change
        </button>
      </div>
    </div>
  );
}
