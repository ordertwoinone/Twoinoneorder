"use client";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Heart, ChevronDown, Loader2 } from "lucide-react";
import { useLocation } from "@/hooks/useLocation";
import { useFavorites } from "@/lib/favorites/FavoritesContext";

export default function Navbar({ className = "" }: { className?: string }) {
  const { location, detect } = useLocation();
  const { keys: favKeys } = useFavorites();
  const favCount = favKeys.size;

  const displayArea =
    location.status === "granted" ? location.area : "Set your location";

  return (
    <nav className={`sticky top-0 z-50 bg-white${className ? ` ${className}` : ""}`}>
      <div className="max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center gap-2">

        {/* "Deliver to" — leads the header, tap to detect. The side columns
            share the leftover width evenly so the logo stays truly centred. */}
        <div className="flex-1 min-w-0 flex justify-start">
          <button
            onClick={detect}
            disabled={location.status === "loading"}
            aria-label="Set delivery location"
            className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-left min-w-0 hover:bg-gray-50 transition-colors disabled:cursor-default"
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
                  <span className="truncate max-w-[95px] sm:max-w-[130px]">{displayArea}</span>
                  <ChevronDown size={12} className="text-gray-500 shrink-0" />
                </span>
              )}
            </span>
          </button>
        </div>

        {/* Logo + Brand — centred in the header */}
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0"
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
        <div className="flex-1 min-w-0 flex justify-end">
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
      </div>
    </nav>
  );
}
