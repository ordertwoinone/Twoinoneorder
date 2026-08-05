"use client";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Heart, Navigation, Loader2 } from "lucide-react";
import { useLocation } from "@/hooks/useLocation";
import { useFavorites } from "@/lib/favorites/FavoritesContext";

export default function Navbar({ className = "" }: { className?: string }) {
  const { location, detect } = useLocation();
  const { keys: favKeys } = useFavorites();
  const favCount = favKeys.size;

  const displayArea =
    location.status === "granted" ? location.area : "Use my location";

  return (
    <nav className={`sticky top-0 z-50 bg-white${className ? ` ${className}` : ""}`}>
      <div className="relative max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center gap-3">

        {/* Location — leads the header (mobile uses the "Deliver to" bar) */}
        <button
          onClick={detect}
          disabled={location.status === "loading"}
          aria-label="Use my current location"
          className="hidden sm:flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-gray-50 transition-colors disabled:cursor-default shrink-0"
        >
          <MapPin size={14} fill="#ea580c" stroke="none" />
          {location.status === "loading" ? (
            <Loader2 size={12} className="animate-spin" style={{ color: "#ea580c" }} />
          ) : (
            <span className="text-[11px] font-semibold text-gray-800 max-w-[100px] truncate block">
              {displayArea}
            </span>
          )}
          {location.status !== "loading" && location.status !== "granted" && (
            <Navigation size={11} style={{ color: "#ea580c" }} />
          )}
        </button>

        {/* Logo + Brand — centred in the header */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 shrink-0"
        >
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
              Two In One Order
            </p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">
              4 Restaurants. One Destination.
            </p>
          </div>
        </Link>

        {/* Favourites */}
        <Link
          href="/account/favourites"
          aria-label="Favourites"
          className="ml-auto relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors shrink-0"
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
  );
}
