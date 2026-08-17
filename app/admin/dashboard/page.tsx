"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Store, TrendingUp, ShoppingBag, Receipt, XCircle, Download, RefreshCw, Flame,
} from "lucide-react";

/**
 * admin → Dashboard, which is the business report.
 *
 * One question — what did the business take — answered for a period the
 * operator picks, then broken down by where it came from. Our own bookings and
 * the take.app storefronts are summed together at the top and kept apart in the
 * breakdown, because both readings are useful and only one of them is a total.
 */

interface Bucket {
  name: string;
  source: "own" | "takeapp";
  orders: number;
  revenue: number;
  cancelled: number;
}

interface ItemRow {
  name: string;
  where: string;
  qty: number;
  revenue: number;
}

interface Report {
  totals: { orders: number; cancelled: number; revenue: number; average: number };
  byDay: { date: string; orders: number; revenue: number }[];
  byRestaurant: Bucket[];
  byItem: ItemRow[];
  byPayment: { method: string; orders: number; revenue: number }[];
  warning: string | null;
}

type PeriodKey = "today" | "week" | "month" | "year" | "custom";

/** yyyy-mm-dd for a local date, which is what the date inputs speak. */
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The span each preset covers, ending today.
 *
 * "This week" is the last seven days rather than since Monday: a report that
 * collapses to one day every Monday morning is no use to anybody.
 */
function spanFor(period: PeriodKey): { from: string; to: string } {
  const today = new Date();
  const start = new Date(today);

  if (period === "today") { /* start stays today */ }
  else if (period === "week") start.setDate(start.getDate() - 6);
  else if (period === "month") start.setDate(start.getDate() - 29);
  else if (period === "year") start.setFullYear(start.getFullYear() - 1);

  return { from: iso(start), to: iso(today) };
}

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Last 7 days" },
  { key: "month", label: "Last 30 days" },
  { key: "year", label: "Last 12 months" },
  { key: "custom", label: "Custom" },
];

const inputCls =
  "px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function AdminDashboard() {
  const [period, setPeriod] = useState<PeriodKey>("week");
  const [range, setRange] = useState(() => spanFor("week"));
  const [report, setReport] = useState<Report | null>(null);
  const [restaurant, setRestaurant] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        from: range.from,
        to: range.to,
        // The server has no idea where it is running; a day is the operator's.
        tzOffset: String(new Date().getTimezoneOffset()),
      });
      const res = await fetch(`/api/admin/report?${params}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
      setReport(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the report.");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  function choose(key: PeriodKey) {
    setPeriod(key);
    if (key !== "custom") setRange(spanFor(key));
  }

  /* One restaurant's figures, or all of them. Filtering here rather than
     server-side keeps the whole picture one request — the report is small. */
  const shown = useMemo(() => {
    if (!report) return null;
    if (!restaurant) return report;

    const rows = report.byRestaurant.filter((r) => r.name === restaurant);
    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    const orders = rows.reduce((s, r) => s + r.orders, 0);
    const cancelled = rows.reduce((s, r) => s + r.cancelled, 0);
    return {
      ...report,
      byRestaurant: rows,
      byItem: report.byItem.filter((i) => i.where === restaurant),
      totals: {
        orders,
        cancelled,
        revenue: Math.round(revenue * 100) / 100,
        average: orders - cancelled > 0 ? Math.round((revenue / (orders - cancelled)) * 100) / 100 : 0,
      },
    };
  }, [report, restaurant]);

  const peak = useMemo(
    () => Math.max(1, ...(shown?.byDay ?? []).map((d) => d.revenue)),
    [shown],
  );

  /** The best seller, which every other bar is drawn against. */
  const topQty = useMemo(
    () => Math.max(1, ...(shown?.byItem ?? []).map((i) => i.qty)),
    [shown],
  );

  function downloadReport() {
    if (!shown) return;
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines: string[] = [
      `"Business report",${escape(`${range.from} to ${range.to}`)}`,
      "",
      '"Orders","Cancelled","Revenue (AED)","Average order (AED)"',
      [shown.totals.orders, shown.totals.cancelled, shown.totals.revenue, shown.totals.average]
        .map(escape).join(","),
      "",
      '"Where","Source","Orders","Cancelled","Revenue (AED)"',
      ...shown.byRestaurant.map((r) =>
        [r.name, r.source === "own" ? "Own" : "take.app", r.orders, r.cancelled, r.revenue]
          .map(escape).join(","),
      ),
      "",
      '"Date","Orders","Revenue (AED)"',
      ...shown.byDay.map((d) => [d.date, d.orders, d.revenue].map(escape).join(",")),
      "",
      '"Item","Where","Quantity sold","Revenue (AED)"',
      ...shown.byItem.map((i) => [i.name, i.where, i.qty, i.revenue].map(escape).join(",")),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `business-report-${range.from}_to_${range.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const cards = [
    { label: "Revenue", value: `AED ${(shown?.totals.revenue ?? 0).toFixed(2)}`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Orders", value: String(shown?.totals.orders ?? 0), icon: ShoppingBag, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Average order", value: `AED ${(shown?.totals.average ?? 0).toFixed(2)}`, icon: Receipt, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Cancelled", value: String(shown?.totals.cancelled ?? 0), icon: XCircle, color: "text-gray-500", bg: "bg-gray-100" },
  ];

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {range.from === range.to ? range.from : `${range.from} → ${range.to}`}
            {loading && " · loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={downloadReport}
            disabled={!shown}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "#ea580c" }}
          >
            <Download size={14} />
            Download report
          </button>
        </div>
      </div>

      {/* Period */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 mb-5 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => choose(p.key)}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                period === p.key
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-700">From</span>
              <input
                type="date"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-700">To</span>
              <input
                type="date"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                className={inputCls}
              />
            </label>
          </>
        )}

        <label className="flex flex-col gap-1 ms-auto">
          <span className="text-xs font-semibold text-gray-700">Restaurant</span>
          <select
            value={restaurant}
            onChange={(e) => setRestaurant(e.target.value)}
            className={inputCls}
          >
            <option value="">All restaurants</option>
            {(report?.byRestaurant ?? []).map((r) => (
              <option key={`${r.source}:${r.name}`} value={r.name}>{r.name}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-5">
          {error}
        </p>
      )}
      {report?.warning && (
        <p className="text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-5">
          {report.warning}
        </p>
      )}

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Where it came from */}
        <Panel icon={Store} title="By restaurant">
          {(shown?.byRestaurant.length ?? 0) === 0 ? (
            <Empty loading={loading} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-2">Where</th>
                  <th className="pb-2 text-right">Orders</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {shown!.byRestaurant.map((r) => (
                  <tr key={`${r.source}:${r.name}`} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5">
                      <p className="font-medium text-gray-800">{r.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {r.source === "own" ? "Ours" : "take.app"}
                        {r.cancelled > 0 && ` · ${r.cancelled} cancelled`}
                      </p>
                    </td>
                    <td className="py-2.5 text-right text-gray-600">{r.orders}</td>
                    <td className="py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                      AED {r.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {/* Day by day */}
        <Panel icon={TrendingUp} title="Day by day">
          {(shown?.byDay.length ?? 0) === 0 ? (
            <Empty loading={loading} />
          ) : (
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
              {shown!.byDay.map((d) => (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="w-[86px] shrink-0 text-[12px] text-gray-500">{d.date}</span>
                  {/* A bar against the busiest day, so the shape of the week
                      reads at a glance without a charting library. */}
                  <span className="flex-1 h-4 rounded bg-gray-100 overflow-hidden">
                    <span
                      className="block h-full rounded bg-orange-400"
                      style={{ width: `${Math.max(2, (d.revenue / peak) * 100)}%` }}
                    />
                  </span>
                  <span className="w-[92px] shrink-0 text-right text-[12px] font-semibold text-gray-900">
                    AED {d.revenue.toFixed(2)}
                  </span>
                  <span className="w-8 shrink-0 text-right text-[11px] text-gray-400">{d.orders}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* What sold */}
      <div className="mt-5">
        <Panel icon={Flame} title="Best sellers">
          {(shown?.byItem.length ?? 0) === 0 ? (
            <Empty loading={loading} />
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                    <th className="pb-2 w-8">#</th>
                    <th className="pb-2">Item</th>
                    <th className="pb-2 text-right">Sold</th>
                    <th className="pb-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {shown!.byItem.map((item, i) => (
                    <tr key={`${item.where}:${item.name}`} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 text-gray-400 tabular-nums">{i + 1}</td>
                      <td className="py-2.5">
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-[11px] text-gray-400">{item.where}</p>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="inline-flex items-center gap-2">
                          {/* Against the best seller, so the gap between first
                              and fifth is visible rather than arithmetic. */}
                          <span className="hidden sm:block w-20 h-1.5 rounded bg-gray-100 overflow-hidden">
                            <span
                              className="block h-full rounded bg-orange-400"
                              style={{ width: `${Math.max(4, (item.qty / topQty) * 100)}%` }}
                            />
                          </span>
                          <span className="font-bold text-gray-900 tabular-nums w-8 text-right">
                            {item.qty}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-gray-600 whitespace-nowrap">
                        AED {item.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-3">
            Counted from itemised orders. A table booking has no dishes, and a Kalba order placed
            before the invoice migration ran recorded its items as text — neither can be counted
            here. The top hundred are shown; the CSV carries every one.
          </p>
        </Panel>
      </div>

      {/* How it was paid */}
      {(shown?.byPayment.length ?? 0) > 0 && (
        <div className="mt-5">
          <Panel icon={Receipt} title="How it was paid">
            <div className="grid sm:grid-cols-3 gap-3">
              {shown!.byPayment.map((p) => (
                <div key={p.method} className="rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 capitalize">{p.method}</p>
                  <p className="text-lg font-extrabold text-gray-900 mt-0.5">
                    AED {p.revenue.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-gray-400">{p.orders} orders</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              Cash and card come from Order History, where staff mark how each order was settled.
              take.app reports only whether its own orders were paid.
            </p>
          </Panel>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">Every order, line by line</p>
          <p className="text-sm text-gray-500 mt-0.5">
            Search, change status or payment, and print an invoice
          </p>
        </div>
        <Link
          href="/admin/order-history"
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#ea580c" }}
        >
          Open Order History
        </Link>
      </div>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <Icon size={16} className="text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Empty({ loading }: { loading: boolean }) {
  return (
    <p className="py-8 text-center text-sm text-gray-400">
      {loading ? "Loading…" : "Nothing in this period."}
    </p>
  );
}
