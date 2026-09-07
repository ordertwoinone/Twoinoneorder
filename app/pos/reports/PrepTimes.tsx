"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Download, Filter, Timer } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed } from "@/lib/pos/cart";
import { addBusinessDays, businessDateFor, businessDateLabel } from "@/lib/pos/business-day";

/**
 * Which tickets went over, and by how long.
 *
 * The board turns a ticket's clock red at fifteen minutes and then the ticket
 * goes away — so nobody could answer "how often does that happen" without
 * having watched it happen. This is the same threshold, kept afterwards.
 *
 * Prep time is rung-up to the kitchen pressing Done. Only tickets carrying that
 * stamp have one, and the tiles say plainly how many did not rather than
 * folding an estimate into an average nobody could then trust.
 */

interface Ticket {
  id: string;
  code: string;
  source: string;
  channel: string;
  guest: string;
  where: string;
  itemCount: number;
  total: number;
  createdAt: string;
  readyAt: string;
  minutes: number;
  /** Still cooking — the number is minutes so far, not minutes taken. */
  running: boolean;
  status: string;
}

interface Report {
  from: string;
  to: string;
  thresholdMinutes: number;
  hasPrepColumn: boolean;
  totals: {
    orders: number;
    measured: number;
    late: number;
    stillCooking: number;
    unrecorded: number;
    averageMinutes: number;
    worstMinutes: number;
  };
  orders: Ticket[];
}

const CONTROL = { height: 48, borderColor: POS.line, color: POS.ink } as const;
const SELECT =
  "rounded-xl border bg-white px-3.5 text-[14.5px] font-semibold focus:outline-none";

function clock(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function PrepTimes() {
  const today = businessDateFor();

  const [period, setPeriod] = useState<"today" | "7" | "30" | "custom">("7");
  const [from, setFrom] = useState(addBusinessDays(today, -6));
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  const apply = useCallback(async (next?: { from?: string; to?: string }) => {
    const q = { from: next?.from ?? from, to: next?.to ?? to };
    setLoading(true);
    const res = await fetch(`/api/pos/reports/prep?from=${q.from}&to=${q.to}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (body && !body.error) setReport(body as Report);
    setLoading(false);
    setDirty(false);
  }, [from, to]);

  // Once, on arrival. Everything after that is somebody asking.
  useEffect(() => { apply(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function preset(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    apply({ from: nextFrom, to: nextTo });
  }

  function exportCsv() {
    if (!report) return;
    const head = ["Order", "Source", "Customer", "Where", "Items", "Total", "Rung up", "Ready", "Minutes", "State"];
    const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body = report.orders.map((o) => [
      quote(o.code), quote(o.source), quote(o.guest), quote(o.where),
      String(o.itemCount), o.total.toFixed(2),
      clock(o.createdAt), o.readyAt ? clock(o.readyAt) : "",
      String(o.minutes), o.running ? "still cooking" : "done",
    ]);
    const csv = [head.join(","), ...body.map((r) => r.join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `late-orders-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const t = report?.totals;
  const threshold = report?.thresholdMinutes ?? 15;

  return (
    <div className="pos-scroll h-full space-y-4 p-4">
      <section className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${POS.line}` }}>
        <h2 className="text-base font-black" style={{ color: POS.ink }}>
          Orders over {threshold} minutes
        </h2>
        <p className="mt-0.5 text-[12.5px]" style={{ color: POS.inkSoft }}>
          From rung up to the kitchen pressing Done — the same {threshold} minutes that turns a
          ticket red on the orders board.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Period">
            <select
              value={period}
              onChange={(e) => {
                const next = e.target.value as typeof period;
                setPeriod(next);
                if (next === "today") preset(today, today);
                else if (next === "7") preset(addBusinessDays(today, -6), today);
                else if (next === "30") preset(addBusinessDays(today, -29), today);
              }}
              className={SELECT}
              style={{ ...CONTROL, minWidth: 190 }}
            >
              <option value="today">Today</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="custom">Custom range…</option>
            </select>
          </Field>

          {period === "custom" && (
            <>
              <Field label="From">
                <input type="date" value={from} max={to}
                  onChange={(e) => { setFrom(e.target.value); setDirty(true); }}
                  className={SELECT} style={CONTROL} />
              </Field>
              <Field label="To">
                <input type="date" value={to} min={from} max={today}
                  onChange={(e) => { setTo(e.target.value); setDirty(true); }}
                  className={SELECT} style={CONTROL} />
              </Field>
            </>
          )}

          <span className="flex-1" />

          <button
            onClick={() => apply()}
            className="flex items-center gap-2 rounded-xl px-4 text-[14px] font-bold text-white"
            style={{ height: 48, background: dirty ? POS.brand : POS.action }}
          >
            <Filter size={15} />
            {dirty ? "Apply" : "Refresh"}
          </button>
          <button
            onClick={exportCsv}
            disabled={!report || report.orders.length === 0}
            className="flex items-center gap-2 rounded-xl border px-4 text-[14px] font-bold disabled:opacity-40"
            style={{ height: 48, borderColor: POS.brand, color: POS.brand }}
          >
            <Download size={15} />
            Export
          </button>
        </div>
      </section>

      {report && !report.hasPrepColumn && (
        <div
          className="flex items-start gap-2.5 rounded-2xl px-4 py-3"
          style={{ background: POS.badSoft, border: `1px solid ${POS.bad}33` }}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: POS.bad }} />
          <p className="text-[12.5px] leading-relaxed" style={{ color: POS.bad }}>
            <span className="font-bold">Prep times are not being recorded.</span>{" "}
            supabase/order_prep_time.sql has not been run on this database, so nothing stamps a
            ticket when the kitchen marks it done. Only orders still cooking can be listed below —
            an empty list here is a missing migration, not a fast kitchen.
          </p>
        </div>
      )}

      {loading && !report ? (
        <p className="py-16 text-center text-sm" style={{ color: POS.inkSoft }}>Working it out…</p>
      ) : !t ? (
        <p className="py-16 text-center text-sm" style={{ color: POS.inkSoft }}>Nothing to report.</p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label={`Over ${threshold} min`}
              value={String(t.late)}
              hint={t.measured > 0 ? `of ${t.measured} timed orders` : "nothing timed yet"}
              tone={t.late === 0 ? POS.good : POS.bad}
            />
            <Tile label="Average prep time" value={`${t.averageMinutes} min`} hint="across every timed order" />
            <Tile label="Worst" value={t.worstMinutes > 0 ? `${t.worstMinutes} min` : "—"} hint="longest in the range" />
            <Tile
              label="Not timed"
              value={String(t.unrecorded)}
              hint="kitchen never pressed Done"
              tone={t.unrecorded > 0 ? POS.warn : undefined}
            />
          </section>

          {t.stillCooking > 0 && (
            <p className="text-[12.5px]" style={{ color: POS.inkSoft }}>
              {t.stillCooking} order{t.stillCooking === 1 ? " is" : "s are"} still on the pass. Any
              already past {threshold} minutes {t.stillCooking === 1 ? "is" : "are"} listed below
              with the clock still running.
            </p>
          )}

          <section className="overflow-hidden rounded-2xl bg-white" style={{ border: `1px solid ${POS.line}` }}>
            <div className="flex items-baseline gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${POS.line}` }}>
              <h3 className="flex items-center gap-2 text-sm font-black" style={{ color: POS.ink }}>
                <Timer size={15} style={{ color: POS.inkSoft }} />
                Late orders
              </h3>
              <span className="text-[12.5px]" style={{ color: POS.inkSoft }}>
                {businessDateLabel(report.from)} — {businessDateLabel(report.to)}
              </span>
            </div>

            {report.orders.length === 0 ? (
              <p className="py-14 text-center text-[13px]" style={{ color: POS.inkSoft }}>
                Nothing took longer than {threshold} minutes.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]" style={{ minWidth: 920 }}>
                  <thead>
                    <tr style={{ background: POS.page, color: POS.inkSoft }}>
                      {["Order", "Source", "Customer", "Items", "Total", "Rung up", "Ready", "Took"].map((h, i) => (
                        <th
                          key={h}
                          className={`px-3 py-2.5 text-[10.5px] font-black uppercase tracking-wide ${i >= 3 ? "text-right" : "text-left"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.orders.map((o) => (
                      <tr key={o.id} style={{ borderTop: `1px solid ${POS.line}` }}>
                        <td className="px-3 py-2.5 font-bold" style={{ color: "#1D4ED8" }}>
                          {o.code}
                          <span className="block text-[10.5px] font-semibold" style={{ color: POS.inkSoft }}>
                            {businessDateLabel(o.createdAt.slice(0, 10))}
                          </span>
                        </td>
                        <td className="px-3 py-2.5" style={{ color: POS.inkSoft }}>{o.source}</td>
                        <td className="px-3 py-2.5" style={{ color: POS.ink }}>
                          {o.guest || "—"}
                          {o.where && (
                            <span className="block text-[10.5px]" style={{ color: POS.inkSoft }}>{o.where}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: POS.inkSoft }}>
                          {o.itemCount}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: POS.ink }}>
                          {aed(o.total)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: POS.inkSoft }}>
                          {clock(o.createdAt)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: POS.inkSoft }}>
                          {o.running ? "—" : clock(o.readyAt)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="text-[13px] font-black tabular-nums" style={{ color: POS.bad }}>
                            {o.minutes} min
                          </span>
                          {/* A running clock is "so far", not "took". The
                              difference matters: one is a finished problem and
                              the other is a customer still waiting. */}
                          {o.running && (
                            <span className="block text-[10px] font-bold" style={{ color: POS.warn }}>
                              still cooking
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${POS.line}` }}>
      <p className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: POS.inkSoft }}>{label}</p>
      <p className="mt-1 text-[22px] font-black" style={{ color: tone ?? POS.ink }}>{value}</p>
      {hint && <p className="text-[11.5px]" style={{ color: POS.inkSoft }}>{hint}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: POS.inkSoft }}>
        {label}
      </span>
      {children}
    </label>
  );
}
