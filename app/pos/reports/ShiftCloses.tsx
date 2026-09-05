"use client";

import { useCallback, useEffect, useState } from "react";
import { CameraOff, Lock, ScrollText } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed } from "@/lib/pos/cart";
import { businessDateLabel } from "@/lib/pos/business-day";

/**
 * Every shift that has been closed, with the photograph taken when it was.
 *
 * The picture was being captured and stored and then never shown anywhere,
 * which makes it a camera nobody can see the output of — the opposite of what
 * it is for. A deterrent people know about changes behaviour; one that only
 * ever writes to a column does not.
 *
 * So it sits beside the figure it belongs to: who signed off, what the drawer
 * came to, how far off it was. A blank where a photo should be is itself worth
 * seeing, and is drawn as a gap rather than skipped — it means a shift was
 * signed off with nobody's face on it.
 */

interface ShiftRow {
  id: string;
  label: string;
  businessDate: string;
  openedAt: string;
  closedAt: string;
  openedBy: string;
  closedBy: string;
  openingFloat: number;
  countedCash: number;
  expectedCash: number;
  difference: number;
  netSales: number;
  orderCount: number;
  note: string;
  photo: string;
}

function clock(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function ShiftCloses() {
  const [rows, setRows] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<ShiftRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/pos/reports/shifts?limit=40", { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (Array.isArray(body?.shifts)) setRows(body.shifts as ShiftRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="pos-scroll h-full p-4">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="flex items-center gap-2 text-sm font-black" style={{ color: POS.ink }}>
          <Lock size={16} style={{ color: POS.inkSoft }} />
          Shift closes
        </h2>
        <span className="text-[12.5px]" style={{ color: POS.inkSoft }}>
          the last {rows.length} signed off
        </span>
      </div>

      {loading && rows.length === 0 ? (
        <p className="py-16 text-center text-sm" style={{ color: POS.inkSoft }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-sm" style={{ color: POS.inkSoft }}>
          No shift has been closed yet.
        </p>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        >
          {rows.map((row) => (
            <div
              key={row.id}
              className="overflow-hidden rounded-2xl bg-white"
              style={{ border: `1px solid ${POS.line}` }}
            >
              <button
                onClick={() => row.photo && setZoom(row)}
                disabled={!row.photo}
                className="relative block w-full"
                style={{ aspectRatio: "4 / 3", background: "#111" }}
              >
                {row.photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={row.photo} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-4 text-center">
                    <CameraOff size={20} style={{ color: "#6B7280" }} />
                    <span className="text-[11.5px]" style={{ color: "#9CA3AF" }}>
                      No photo was taken at this close
                    </span>
                  </span>
                )}
              </button>

              <div className="p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13.5px] font-black" style={{ color: POS.ink }}>
                    {row.closedBy || row.openedBy}
                  </span>
                  <span
                    className="shrink-0 text-[12.5px] font-bold"
                    style={{ color: row.difference === 0 ? POS.good : POS.bad }}
                  >
                    {row.difference === 0
                      ? "Balanced"
                      : `${row.difference > 0 ? "+" : "−"}${aed(Math.abs(row.difference))}`}
                  </span>
                </div>

                <p className="text-[11.5px]" style={{ color: POS.inkSoft }}>
                  {row.businessDate ? `${businessDateLabel(row.businessDate)} · ` : ""}
                  {row.label} · {clock(row.openedAt)}–{clock(row.closedAt)}
                </p>

                <div className="mt-2 space-y-0.5 pt-2" style={{ borderTop: `1px solid ${POS.line}` }}>
                  <Row label="Net sales" value={aed(row.netSales)} />
                  <Row label={`Orders`} value={String(row.orderCount)} />
                  <Row label="Expected" value={aed(row.expectedCash)} muted />
                  <Row label="Counted" value={aed(row.countedCash)} muted />
                </div>

                {row.note && (
                  <p
                    className="mt-2 flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px]"
                    style={{ background: POS.page, color: POS.inkSoft }}
                  >
                    <ScrollText size={12} className="mt-0.5 shrink-0" />
                    <span>{row.note}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full size, because a thumbnail of a face at 280px is not evidence of
          anything. Click anywhere to dismiss. */}
      {zoom && (
        <button
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ background: "rgba(0,0,0,0.75)" }}
        >
          <span className="flex max-h-full flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoom.photo}
              alt=""
              className="max-h-[75vh] rounded-xl object-contain"
            />
            <span className="text-[13px] font-semibold text-white">
              {zoom.closedBy || zoom.openedBy} ·{" "}
              {zoom.businessDate ? businessDateLabel(zoom.businessDate) : ""} · {zoom.label} shift
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[12px]" style={{ color: POS.inkSoft }}>{label}</span>
      <span
        className="text-[12.5px] font-semibold"
        style={{ color: muted ? POS.inkSoft : POS.ink }}
      >
        {value}
      </span>
    </div>
  );
}
