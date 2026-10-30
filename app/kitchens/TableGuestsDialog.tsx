"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, Users, X } from "lucide-react";
import { useLocalized } from "@/lib/i18n/localized";
import { useTranslation } from "@/lib/i18n/useTranslation";

export interface DiningTable {
  code: string;
  section: string;
  /** Free text in the table list: "4", or a range like "8–10". */
  seats: string;
  status: string;
}

export interface Seating {
  table: string | null;
  guests: number;
}

const RED = "#b71c24";
const MAX_GUESTS = 20;

const SECTION_AR: Record<string, string> = {
  "Main Dining Hall": "صالة الطعام الرئيسية",
  "VIP Majlis Area": "مجلس كبار الشخصيات",
  "Outdoor Terrace": "التراس الخارجي",
};

/** The most a table seats: "8–10" holds 10. */
function maxSeats(seats: string): number {
  const numbers = seats.match(/\d+/g);
  return numbers ? Number(numbers[numbers.length - 1]) : 0;
}

export default function TableGuestsDialog({
  tables, initial, fontClass, headingFont, onConfirm, onClose,
}: {
  tables: DiningTable[];
  initial: Seating | null;
  fontClass: string;
  headingFont: string;
  onConfirm: (seating: Seating) => void;
  /** Absent on first arrival, when the choice has to be made. */
  onClose?: () => void;
}) {
  const { t, tp } = useTranslation();
  const localized = useLocalized();
  const [guests, setGuests] = useState(initial?.guests ?? 2);
  const [table, setTable] = useState<string | null>(initial?.table ?? null);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sections = Array.from(new Set(tables.map((x) => x.section)));
  // With no tables to list, the guest count is still worth asking for.
  const canContinue = tables.length === 0 || table !== null;

  /* Portalled because app/template.tsx's page-enter wrapper is its own stacking
     context, which would leave this underneath the install prompt (z-60). */
  return createPortal(
    <div className={`fixed inset-0 z-[65] flex items-end justify-center bg-black/50 sm:items-center sm:p-6 ${fontClass}`}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kitchens-seating-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom,0px)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h2 id="kitchens-seating-title" className="text-2xl font-bold text-gray-900" style={{ fontFamily: headingFont }}>
            {t("kitchens.seatingTitle")}
          </h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Users size={17} />
              {t("kitchens.howManyPeople")}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGuests((n) => Math.max(1, n - 1))}
                disabled={guests <= 1}
                aria-label={t("kitchens.fewerPeople")}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-800 hover:bg-gray-100 disabled:opacity-40"
              >
                <Minus size={16} strokeWidth={3} />
              </button>
              <span className="w-7 text-center text-lg font-bold text-gray-900" aria-live="polite">{guests}</span>
              <button
                type="button"
                onClick={() => setGuests((n) => Math.min(MAX_GUESTS, n + 1))}
                disabled={guests >= MAX_GUESTS}
                aria-label={t("kitchens.morePeople")}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:opacity-90 disabled:opacity-40"
                style={{ background: RED }}
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>
          </div>

          {tables.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900">{t("kitchens.selectTable")}</p>
              {sections.map((section) => (
                <div key={section} className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-gray-500">{localized(section, SECTION_AR[section])}</p>
                  <div className="grid grid-cols-3 gap-2 min-[375px]:grid-cols-4">
                    {tables.filter((x) => x.section === section).map((x) => {
                      const active = table === x.code;
                      const booked = x.status === "booked";
                      const tooSmall = maxSeats(x.seats) > 0 && maxSeats(x.seats) < guests;
                      return (
                        <button
                          key={x.code}
                          type="button"
                          disabled={booked}
                          onClick={() => setTable(x.code)}
                          aria-pressed={active}
                          className={`rounded-lg border-2 px-1 py-2 text-center transition-colors disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50 ${
                            active ? "text-white" : "border-gray-200 bg-white text-gray-900 hover:border-gray-400"
                          } ${tooSmall && !active ? "opacity-60" : ""}`}
                          style={active ? { background: RED, borderColor: RED } : undefined}
                        >
                          <span className="block text-sm font-bold">{x.code}</span>
                          <span className={`block text-[11px] ${active ? "text-white/90" : "text-gray-500"}`}>
                            {booked ? t("kitchens.tableBooked") : t("kitchens.tableSeats", { seats: x.seats })}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => onConfirm({ table, guests })}
            className="h-12 w-full rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
            style={{ background: RED }}
          >
            {canContinue ? `${t("kitchens.viewMenu")} · ${tp("kitchens.guests", guests)}` : t("kitchens.chooseTableFirst")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
