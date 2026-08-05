"use client";
import Link from "next/link";
import Image from "next/image";
import { MapPin, ChevronDown, Loader2 } from "lucide-react";
import { useLocation } from "@/hooks/useLocation";

export interface NavbarContent {
  /** Dark half of the wordmark, e.g. "TWOINONE". */
  title: string;
  /** Orange half, e.g. "ORDER". Blank hides it. */
  titleHighlight: string;
  /** Small line under the wordmark. Blank hides it. */
  tagline: string;
  logoUrl: string;
}

export default function NavbarClient({
  className = "",
  content,
}: {
  className?: string;
  content: NavbarContent;
}) {
  const { location, detect } = useLocation();

  const displayArea =
    location.status === "granted" ? location.area : "Set your location";

  return (
    <nav className={`sticky top-0 z-50 bg-white${className ? ` ${className}` : ""}`}>
      <div className="max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center gap-3">

        {/* Logo + wordmark — leads the header. Both lines show at every width;
            they truncate before they can push the location off the row. */}
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="relative w-10 h-10 shrink-0">
            <Image
              src={content.logoUrl}
              alt={content.title}
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="font-brand text-[13px] sm:text-[17px] font-extrabold leading-none tracking-tight uppercase truncate">
              <span className="text-gray-900">{content.title}</span>
              {content.titleHighlight && (
                <span style={{ color: "#ea580c" }}> {content.titleHighlight}</span>
              )}
            </p>
            {content.tagline && (
              <p className="font-brand text-[8.5px] sm:text-[10.5px] font-semibold text-gray-400 leading-none mt-1 truncate">
                {content.tagline}
              </p>
            )}
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
