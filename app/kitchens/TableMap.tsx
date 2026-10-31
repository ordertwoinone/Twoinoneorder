"use client";

import { useRef } from "react";
import { Users } from "lucide-react";
import { areaOutlines, clampPosition, layoutTables, type MapTable } from "@/lib/table-layout";

const RED = "#b71c24";

/** The most a table seats: "8–10" holds 10. */
function maxSeats(seats: string): number {
  const numbers = seats.match(/\d+/g);
  return numbers ? Number(numbers[numbers.length - 1]) : 0;
}

const SHAPE_CLS = {
  square: "w-[15%] aspect-square rounded-lg",
  round: "w-[15%] aspect-square rounded-full",
  long: "w-[22%] aspect-[3/2] rounded-lg",
};

/**
 * The floor as a blueprint. Guests tap a table on it; with `onMove`, admin drags
 * them instead. Always left-to-right, because the room doesn't mirror in Arabic.
 */
export default function TableMap<T extends MapTable>({
  tables, selected, guests, onSelect, onMove, areaLabel, tableLabel,
}: {
  tables: T[];
  selected?: string | null;
  guests?: number;
  onSelect?: (code: string) => void;
  onMove?: (code: string, x: number, y: number) => void;
  areaLabel?: (section: string) => string;
  tableLabel: (table: T) => string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const placed = layoutTables(tables);

  const dragTo = (e: React.PointerEvent, code: string) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect || !onMove) return;
    onMove(
      code,
      clampPosition(((e.clientX - rect.left) / rect.width) * 100),
      clampPosition(((e.clientY - rect.top) / rect.height) * 100),
    );
  };

  return (
    <div
      ref={mapRef}
      dir="ltr"
      className="relative aspect-square w-full select-none overflow-hidden rounded-xl"
      style={{
        backgroundColor: "#123c63",
        backgroundImage:
          "linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px)",
        backgroundSize: "10% 10%",
      }}
    >
      {areaOutlines(placed).map((area) => (
        <div
          key={area.section}
          aria-hidden
          className="pointer-events-none absolute rounded-md border border-dashed border-white/40"
          style={{ left: `${area.left}%`, top: `${area.top}%`, width: `${area.width}%`, height: `${area.height}%` }}
        >
          <span className="absolute start-1 top-0.5 whitespace-nowrap text-[9px] font-medium uppercase tracking-wide text-white/70 sm:text-[10px]">
            {areaLabel ? areaLabel(area.section) : area.section}
          </span>
        </div>
      ))}

      {placed.map((table) => {
        const active = selected === table.code;
        const booked = table.status === "booked";
        const tooSmall = guests !== undefined && maxSeats(table.seats) > 0 && maxSeats(table.seats) < guests;
        return (
          <button
            key={table.code}
            type="button"
            disabled={booked}
            aria-pressed={onSelect ? active : undefined}
            aria-label={tableLabel(table)}
            onClick={onSelect ? () => onSelect(table.code) : undefined}
            onPointerDown={onMove ? (e) => e.currentTarget.setPointerCapture(e.pointerId) : undefined}
            onPointerMove={onMove ? (e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) dragTo(e, table.code); } : undefined}
            className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center border-2 leading-none shadow-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${SHAPE_CLS[table.shape ?? "square"]} ${
              active ? "text-white" : "border-white bg-white text-gray-900"
            } ${tooSmall && !active ? "opacity-60" : ""} ${onMove ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
            style={{ left: `${table.x}%`, top: `${table.y}%`, ...(active ? { background: RED, borderColor: "#fff" } : {}) }}
          >
            <span className="text-[13px] font-bold sm:text-sm">{table.code}</span>
            <span className={`mt-1 flex items-center gap-0.5 text-[9px] sm:text-[10px] ${active ? "text-white/90" : "text-gray-500"}`}>
              <Users size={9} />
              {table.seats}
            </span>
          </button>
        );
      })}
    </div>
  );
}
