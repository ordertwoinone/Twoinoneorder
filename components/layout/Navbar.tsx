"use client";
import Link from "next/link";
import Image from "next/image";
import { MapPin, ChevronDown, Loader2 } from "lucide-react";
import { useLocation } from "@/hooks/useLocation";

export default function Navbar({ className = "" }: { className?: string }) {
  const { location, detect } = useLocation();

  const displayArea =
    location.status === "granted" ? location.area : "Set your location";

  return (
    <nav className={`sticky top-0 z-50 bg-white${className ? ` ${className}` : ""}`}>
      <div className="max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center gap-3">

        {/* Logo + Brand — leads the header. The name shows at every width;
            it truncates before it can push the location off the row. */}
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="relative w-10 h-10 shrink-0">
            <Image
              src="/logos/two-in-one.png"
              alt="Two In One"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-[13px] font-extrabold text-gray-900 leading-tight tracking-wide uppercase truncate">
              Two In One Order
            </p>
            <p className="hidden sm:block text-[10px] text-gray-400 leading-none mt-0.5">
              4 Restaurants. One Destination.
            </p>
          </div>
        </Link>

        {/* "Deliver to" — closes the header, tap to detect */}
        <button
          onClick={detect}
          disabled={location.status === "loading"}
          aria-label="Set delivery location"
          className="ml-auto shrink-0 flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-left hover:bg-gray-50 transition-colors disabled:cursor-default"
        >
          <MapPin size={15} fill="#ea580c" stroke="none" className="shrink-0" />
          <span className="min-w-0">
            <span className="block text-[9px] text-gray-400 leading-none mb-0.5">
              Deliver to
            </span>
            {location.status === "loading" ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500">
                <Loader2 size={11} className="animate-spin" style={{ color: "#ea580c" }} />
                Detecting…
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-[11px] font-bold text-gray-900">
                <span className="truncate max-w-[85px] sm:max-w-[150px]">{displayArea}</span>
                <ChevronDown size={12} className="text-gray-500 shrink-0" />
              </span>
            )}
          </span>
        </button>
      </div>
    </nav>
  );
}
