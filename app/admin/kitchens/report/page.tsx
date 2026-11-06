"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { money } from "../OrderMoneyCard";

interface Bucket { orders: number; sales: number; guests: number }
interface Report {
  from: string;
  to: string;
  hasTiming: boolean;
  hasSplit: boolean;
  summary: {
    orders: number; cancelledOrders: number; cancelledValue: number;
    gross: number; discount: number; net: number; guests: number; items: number;
    paid: number; cash: number; card: number; credit: number; unpaid: number;
    paidOrders: number; creditOrders: number; unpaidOrders: number;
  };
  avgOrder: number;
  avgPerGuest: number;
  status: Record<string, number>;
  timing: {
    prepAvg: number | null; prepMedian: number | null; prepCount: number;
    serveAvg: number | null; serveMedian: number | null; serveCount: number;
  };
  byDay: (Bucket & { day: string })[];
  byHour: (Bucket & { hour: number })[];
  byWaiter: (Bucket & { name: string })[];
  byTable: (Bucket & { name: string })[];
  byKitchen: { name: string; qty: number; sales: number }[];
  byDish: { name: string; kitchen: string; qty: number; sales: number }[];
}

const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
const labelCls = "block text-xs font-semibold text-gray-700 mb-1";
const thCls = "px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide";
const tdCls = "px-4 py-2.5 text-sm text-gray-700";

/** Today and offsets from it on the restaurant's clock (UTC+4). */
function localDay(offsetDays = 0) {
  return new Date(Date.now() + 4 * 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}
function monthStart() {
  return `${localDay().slice(0, 8)}01`;
}

const PRESETS: { key: string; label: string; range: () => [string, string] }[] = [
  { key: "today", label: "Today", range: () => [localDay(), localDay()] },
  { key: "yesterday", label: "Yesterday", range: () => [localDay(-1), localDay(-1)] },
  { key: "7d", label: "Last 7 days", range: () => [localDay(-6), localDay()] },
  { key: "30d", label: "Last 30 days", range: () => [localDay(-29), localDay()] },
  { key: "month", label: "This month", range: () => [monthStart(), localDay()] },
];

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");
const mins = (m: number | null) => (m == null ? "—" : m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`);
const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(report: Report) {
  const lines: (string | number)[][] = [];
  const s = report.summary;
  lines.push(["Kitchens Page report", `${report.from} to ${report.to}`], []);
  lines.push(["Summary"], ["Orders", s.orders], ["Guests", s.guests], ["Items sold", s.items],
    ["Gross sales", s.gross], ["Discounts", s.discount], ["Net sales", s.net],
    ["Average order", report.avgOrder], ["Average per guest", report.avgPerGuest],
    ["Cash", s.cash], ["Card", s.card], ["Paid", s.paid], ["On credit", s.credit], ["Not paid", s.unpaid],
    ["Cancelled orders", s.cancelledOrders], ["Cancelled value", s.cancelledValue], []);
  lines.push(["By day"], ["Day", "Orders", "Guests", "Sales"], ...report.byDay.map((d) => [d.day, d.orders, d.guests, d.sales]), []);
  lines.push(["By hour"], ["Hour", "Orders", "Guests", "Sales"], ...report.byHour.filter((h) => h.orders).map((h) => [hourLabel(h.hour), h.orders, h.guests, h.sales]), []);
  lines.push(["By waiter"], ["Waiter", "Orders", "Guests", "Sales"], ...report.byWaiter.map((w) => [w.name, w.orders, w.guests, w.sales]), []);
  lines.push(["By kitchen"], ["Kitchen", "Items", "Sales"], ...report.byKitchen.map((k) => [k.name, k.qty, k.sales]), []);
  lines.push(["By dish"], ["Dish", "Kitchen", "Qty", "Sales"], ...report.byDish.map((d) => [d.name, d.kitchen, d.qty, d.sales]), []);
  lines.push(["By table"], ["Table", "Orders", "Guests", "Sales"], ...report.byTable.map((t) => [t.name, t.orders, t.guests, t.sales]));
  const blob = new Blob([lines.map((l) => l.map(csvCell).join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kitchens-report-${report.from}${report.to !== report.from ? `-to-${report.to}` : ""}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-900 mt-0.5 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-xl border border-gray-200 overflow-hidden break-inside-avoid ${className}`}>
      <h2 className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

/** A horizontal bar list: label, a bar sized to the largest value, and the figure. */
function Bars({ rows, empty }: { rows: { label: string; value: number; note: string }[]; empty: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (!rows.length || max === 0) return <p className="px-4 py-8 text-center text-sm text-gray-400">{empty}</p>;
  return (
    <ul className="px-4 py-3 space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[88px_1fr_auto] items-center gap-3 text-xs">
          <span className="text-gray-600 truncate">{r.label}</span>
          <span className="h-3 rounded bg-gray-100 overflow-hidden">
            <span className="block h-full rounded bg-orange-400" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="text-gray-800 tabular-nums whitespace-nowrap text-right min-w-[110px]">{r.note}</span>
        </li>
      ))}
    </ul>
  );
}

function SalesTable({ head, rows, total }: { head: string; rows: (Bucket & { name: string })[]; total: number }) {
  if (!rows.length) return <p className="px-4 py-8 text-center text-sm text-gray-400">No orders in this range.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr><th className={thCls}>{head}</th><th className={`${thCls} text-right`}>Orders</th><th className={`${thCls} text-right`}>Guests</th><th className={`${thCls} text-right`}>Avg order</th><th className={`${thCls} text-right`}>Sales</th><th className={`${thCls} text-right`}>Share</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-gray-50 last:border-0">
              <td className={`${tdCls} font-medium text-gray-900`}>{r.name}</td>
              <td className={`${tdCls} text-right tabular-nums`}>{r.orders}</td>
              <td className={`${tdCls} text-right tabular-nums`}>{r.guests}</td>
              <td className={`${tdCls} text-right tabular-nums`}>{money(r.orders ? r.sales / r.orders : 0)}</td>
              <td className={`${tdCls} text-right tabular-nums font-semibold text-gray-900`}>{money(r.sales)}</td>
              <td className={`${tdCls} text-right tabular-nums text-gray-500`}>{pct(r.sales, total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function KitchensReportAdmin() {
  const [preset, setPreset] = useState("today");
  const [from, setFrom] = useState(localDay());
  const [to, setTo] = useState(localDay());
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dishFilter, setDishFilter] = useState("");
  const [allDishes, setAllDishes] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const ticket = ++latest.current;
    setLoading(true);
    fetch(`/api/admin/kitchens/report?${new URLSearchParams({ from, to })}`)
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => null) }))
      .catch(() => ({ ok: false, data: null }))
      .then(({ ok, data }) => {
        if (ticket !== latest.current) return;
        setLoading(false);
        if (!ok || !data?.summary) {
          setError(data?.error ?? "Could not load the report.");
          return;
        }
        setError("");
        setReport(data);
      });
  }, [from, to]);

  const choose = (key: string) => {
    const p = PRESETS.find((x) => x.key === key);
    setPreset(key);
    if (p) {
      const [f, t] = p.range();
      setFrom(f);
      setTo(t);
    }
  };

  const dishes = useMemo(() => {
    if (!report) return [];
    const q = dishFilter.trim().toLowerCase();
    return q ? report.byDish.filter((d) => d.name.toLowerCase().includes(q) || d.kitchen.toLowerCase().includes(q)) : report.byDish;
  }, [report, dishFilter]);

  const s = report?.summary;
  const multiDay = report ? report.byDay.length > 1 : false;
  const busyHours = report?.byHour.filter((h) => h.orders > 0) ?? [];
  const firstHour = busyHours[0]?.hour ?? 0;
  const lastHour = busyHours[busyHours.length - 1]?.hour ?? -1;
  const peak = busyHours.reduce<(Bucket & { hour: number }) | null>((best, h) => (!best || h.sales > best.sales ? h : best), null);
  const shownDishes = allDishes || dishFilter ? dishes : dishes.slice(0, 15);

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Kitchens Page</p>
          <h1 className="text-2xl font-semibold text-gray-900">Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {report ? (report.from === report.to ? dayLabel(report.from) : `${dayLabel(report.from)} – ${dayLabel(report.to)}`) : " "}
            {loading && report && <span className="ml-2 text-gray-400">Updating…</span>}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={() => report && downloadCsv(report)} disabled={!report} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => window.print()} disabled={!report} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-40">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      <div className="mb-6 print:hidden">
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESETS.map((p) => (
            <button key={p.key} onClick={() => choose(p.key)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${preset === p.key ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div>
            <label htmlFor="kr-from" className={labelCls}>From</label>
            <input id="kr-from" type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value || localDay()); setPreset(""); }} className={inputCls} />
          </div>
          <div>
            <label htmlFor="kr-to" className={labelCls}>To</label>
            <input id="kr-to" type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value || from); setPreset(""); }} className={inputCls} />
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!report || !s ? (
        <p className="py-16 text-center text-sm text-gray-400">{loading ? "Loading..." : ""}</p>
      ) : (
        <div className={`space-y-6 ${loading ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Net sales" value={money(s.net)} sub={s.discount > 0 ? `${money(s.gross)} before ${money(s.discount)} off` : "After discounts"} />
            <Stat label="Orders" value={String(s.orders)} sub={s.cancelledOrders ? `+ ${s.cancelledOrders} cancelled` : "Excluding cancelled"} />
            <Stat label="Average order" value={money(report.avgOrder)} sub={`${s.items} items sold`} />
            <Stat label="Guests" value={String(s.guests)} sub={`${money(report.avgPerGuest)} per guest`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Payments">
              <dl className="px-4 py-3 text-sm space-y-2">
                {[
                  ["Cash", s.cash, ""],
                  ["Card", s.card, ""],
                  ["Total paid", s.paid, `${s.paidOrders} order${s.paidOrders === 1 ? "" : "s"}`],
                  ["On credit", s.credit, `${s.creditOrders} order${s.creditOrders === 1 ? "" : "s"}`],
                  ["Not paid yet", s.unpaid, `${s.unpaidOrders} order${s.unpaidOrders === 1 ? "" : "s"}`],
                ].map(([label, value, note]) => (
                  <div key={label as string} className={`flex justify-between gap-3 ${label === "Total paid" ? "pt-2 border-t border-gray-100 font-semibold" : ""}`}>
                    <dt className="text-gray-600">{label}{note && <span className="text-xs text-gray-400 font-normal"> · {note}</span>}</dt>
                    <dd className="tabular-nums text-gray-900">{money(value as number)}</dd>
                  </div>
                ))}
                {s.cancelledOrders > 0 && (
                  <div className="flex justify-between gap-3 pt-2 border-t border-gray-100 text-gray-500">
                    <dt>Cancelled <span className="text-xs">· {s.cancelledOrders}</span></dt>
                    <dd className="tabular-nums">{money(s.cancelledValue)}</dd>
                  </div>
                )}
              </dl>
              {!report.hasSplit && <p className="px-4 pb-3 text-[11px] text-gray-400">Cash and card amounts need supabase/kitchen_order_split_payments.sql.</p>}
            </Panel>

            <Panel title="Order status">
              <dl className="px-4 py-3 text-sm space-y-2">
                {[["new", "New"], ["preparing", "Preparing"], ["ready", "Ready"], ["served", "Served"], ["cancelled", "Cancelled"]].map(([key, label]) => (
                  <div key={key} className="flex justify-between gap-3">
                    <dt className="text-gray-600">{label}</dt>
                    <dd className="tabular-nums text-gray-900">{report.status[key] ?? 0}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel title="Speed">
              <dl className="px-4 py-3 text-sm space-y-2">
                <div className="flex justify-between gap-3"><dt className="text-gray-600">Order → ready (average)</dt><dd className="tabular-nums text-gray-900">{mins(report.timing.prepAvg)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-gray-600">Order → ready (median)</dt><dd className="tabular-nums text-gray-900">{mins(report.timing.prepMedian)}</dd></div>
                <div className="flex justify-between gap-3 pt-2 border-t border-gray-100"><dt className="text-gray-600">Order → served (average)</dt><dd className="tabular-nums text-gray-900">{mins(report.timing.serveAvg)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-gray-600">Order → served (median)</dt><dd className="tabular-nums text-gray-900">{mins(report.timing.serveMedian)}</dd></div>
                {peak && <div className="flex justify-between gap-3 pt-2 border-t border-gray-100"><dt className="text-gray-600">Busiest hour</dt><dd className="tabular-nums text-gray-900">{hourLabel(peak.hour)} · {peak.orders} orders</dd></div>}
              </dl>
              <p className="px-4 pb-3 text-[11px] text-gray-400">
                {report.hasTiming ? `From ${report.timing.prepCount} ready and ${report.timing.serveCount} served orders that recorded times.` : "Times need supabase/kitchen_order_timing.sql and kitchen_order_ready.sql."}
              </p>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {multiDay && (
              <Panel title="Sales by day">
                <Bars rows={report.byDay.map((d) => ({ label: dayLabel(d.day), value: d.sales, note: `${money(d.sales)} · ${d.orders}` }))} empty="No orders in this range." />
              </Panel>
            )}
            <Panel title="Sales by hour" className={multiDay ? "" : "lg:col-span-2"}>
              <Bars
                rows={lastHour < 0 ? [] : report.byHour.slice(firstHour, lastHour + 1).map((h) => ({ label: hourLabel(h.hour), value: h.sales, note: `${money(h.sales)} · ${h.orders}` }))}
                empty="No orders in this range."
              />
            </Panel>
          </div>

          <Panel title="By kitchen">
            {report.byKitchen.length === 0 ? <p className="px-4 py-8 text-center text-sm text-gray-400">No items sold in this range.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr><th className={thCls}>Kitchen</th><th className={`${thCls} text-right`}>Items</th><th className={`${thCls} text-right`}>Sales</th><th className={`${thCls} text-right`}>Share</th></tr>
                  </thead>
                  <tbody>
                    {report.byKitchen.map((k) => (
                      <tr key={k.name} className="border-b border-gray-50 last:border-0">
                        <td className={`${tdCls} font-medium text-gray-900`}>{k.name}</td>
                        <td className={`${tdCls} text-right tabular-nums`}>{k.qty}</td>
                        <td className={`${tdCls} text-right tabular-nums font-semibold text-gray-900`}>{money(k.sales)}</td>
                        <td className={`${tdCls} text-right tabular-nums text-gray-500`}>{pct(k.sales, s.gross)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="By waiter">
            <SalesTable head="Waiter" rows={report.byWaiter} total={s.net} />
          </Panel>

          <Panel title="Dishes sold">
            <div className="px-4 py-3 border-b border-gray-100 print:hidden">
              <input type="search" value={dishFilter} onChange={(e) => setDishFilter(e.target.value)} placeholder="Find a dish or kitchen" className={`${inputCls} max-w-xs`} />
            </div>
            {shownDishes.length === 0 ? <p className="px-4 py-8 text-center text-sm text-gray-400">{dishFilter ? "No dish matches." : "No items sold in this range."}</p> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr><th className={thCls}>#</th><th className={thCls}>Dish</th><th className={thCls}>Kitchen</th><th className={`${thCls} text-right`}>Qty</th><th className={`${thCls} text-right`}>Sales</th><th className={`${thCls} text-right`}>Share</th></tr>
                  </thead>
                  <tbody>
                    {shownDishes.map((d, i) => (
                      <tr key={`${d.name}|${d.kitchen}`} className="border-b border-gray-50 last:border-0">
                        <td className={`${tdCls} text-gray-400 tabular-nums`}>{i + 1}</td>
                        <td className={`${tdCls} font-medium text-gray-900`}>{d.name}</td>
                        <td className={`${tdCls} text-gray-500`}>{d.kitchen}</td>
                        <td className={`${tdCls} text-right tabular-nums font-semibold text-gray-900`}>{d.qty}</td>
                        <td className={`${tdCls} text-right tabular-nums`}>{money(d.sales)}</td>
                        <td className={`${tdCls} text-right tabular-nums text-gray-500`}>{pct(d.sales, s.gross)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!dishFilter && dishes.length > 15 && (
              <button onClick={() => setAllDishes((v) => !v)} className="w-full px-4 py-2.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 border-t border-gray-100 print:hidden">
                {allDishes ? "Show top 15" : `Show all ${dishes.length} dishes`}
              </button>
            )}
          </Panel>

          <Panel title="By table">
            <SalesTable head="Table" rows={report.byTable} total={s.net} />
          </Panel>
        </div>
      )}
    </div>
  );
}
