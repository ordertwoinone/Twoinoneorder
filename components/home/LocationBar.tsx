"use client";
import { MapPin, Loader2, ChevronDown } from "lucide-react";
import { useLocation } from "@/hooks/useLocation";
import { useTranslation } from "@/lib/i18n/useTranslation";

// Mobile "Deliver to" bar — sits directly under the header, above the hero.
export default function LocationBar() {
  const { location, detect } = useLocation();
  const { t } = useTranslation();

  const displayArea =
    location.status === "granted" ? location.area : t("header.setLocation");

  return (
    <div className="sm:hidden px-4 pt-2.5 pb-3 bg-white">
      <div className="flex items-center gap-3">
        {/* Deliver to — tap to detect */}
        <button
          onClick={detect}
          disabled={location.status === "loading"}
          className="flex items-center gap-2 text-start min-w-0 disabled:cursor-default"
          aria-label={t("header.setLocationAria")}
        >
          <MapPin size={18} fill="#ea580c" stroke="#ea580c" className="shrink-0" />
          <span className="min-w-0">
            <span className="block text-[11px] text-gray-400 leading-none mb-0.5">
              {t("header.deliverTo")}
            </span>
            {location.status === "loading" ? (
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-gray-500">
                <Loader2 size={13} className="animate-spin" style={{ color: "#ea580c" }} />
                {t("header.detecting")}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[13px] font-bold text-gray-900">
                <span className="truncate max-w-[190px]">{displayArea}</span>
                <ChevronDown size={15} className="text-gray-500 shrink-0" />
              </span>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
