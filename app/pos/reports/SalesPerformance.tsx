"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Download,
  Filter,
  Package,
  Percent,
  PieChart,
  Search,
  ShoppingCart,
  Star,
  Tag,
  TrendingUp,
  Undo2,
} from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed } from "@/lib/pos/cart";

/**
 * Sales Performance.
 *
 * One question in four shapes: what sold, on which days, by whom, in what
 * categories. Everything is worked out on the server (see the route beside
 * this) so two managers on two tablets cannot arrive at two different answers
 * for the same week — the screen picks a range and draws what comes back.
 *
 * "Net sales" is the same number the close screens use: charged, less handed
 * back, on orders where money actually arrived. Staff meals, credit and unpaid
 * tickets are not performance and are left out, which is why this report will
 * not always agree with a raw count of orders — and should not.
 */

interface ItemRow {
  name: string;
  category: string;
  qty: number;
  orders: number;
  gross: number;
  discounts: number;
  refunds: number;
  net: number;
}

interface DayRow {
  date: string;
  orders: number;
  items: number;
  net: number;
  discounts: number;
  refunds: number;
  averageOrder: number;
}

interface Report {
  from: string;
  to: string;
  restricted: boolean;
  totals: {
    net: number;
    gross: number;
    discounts: number;
    refunds: number;
    orders: number;
    itemsSold: number;
    averageOrder: number;
    contribution: number;
  };
  items: ItemRow[];
  byDay: DayRow[];
  byCategory: { category: string; qty: number; net: number }[];
  highlights: { topSelling: string; topEarning: string; bestDay: string; bestDayNet: number };
  employees: { id: string; name: string; staff_id: string }[];
}

const PAGE_SIZE = 10;

/** yyyy-mm-dd for a date this many days back, today included. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function monthStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function pretty(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y) return date;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SalesPerformance() {
  const today = daysAgo(0);

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [source, setSource] = useState<"all" | "pos" | "kiosk">("all");
  const [employee, setEmployee] = useState("");

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"net" | "qty" | "name">("net");
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const url = `/api/pos/reports/sales?from=${from}&to=${to}&source=${source}&staff=${employee}`;
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (body && !body.error) setReport(body as Report);
    setLoading(false);
  }, [from, to, source, employee]);

  useEffect(() => { load(); }, [load]);

  /* Back to page one whenever the list underneath changes. Staying on page
     three of a list that now has one page shows an empty table and reads as a
     report with no data in it. */
  useEffect(() => { setPage(0); }, [query, category, sort, from, to, source, employee]);

  const shown = useMemo(() => {
    if (!report) return [];
    const needle = query.trim().toLowerCase();
    const rows = report.items.filter(
      (i) =>
        (!category || i.category === category) &&
        (!needle || i.name.toLowerCase().includes(needle)),
    );
    return rows.sort((a, b) =>
      sort === "qty" ? b.qty - a.qty : sort === "name" ? a.name.localeCompare(b.name) : b.net - a.net,
    );
  }, [report, query, category, sort]);

  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const pageRows = shown.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const shownNet = shown.reduce((n, r) => n + r.net, 0);

  /** The whole filtered table as a spreadsheet, not just the page on screen. */
  function exportCsv() {
    if (!report) return;
    const head = ["Rank", "Item", "Category", "Qty sold", "Orders", "Gross", "Discounts", "Refunds", "Net"];
    const body = shown.map((r, i) => [
      i + 1,
      /* Quoted and doubled, because a dish called 'Chicken "Special", Large'
         would otherwise become three columns in Excel. */
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.category}"`,
      r.qty,
      r.orders,
      r.gross.toFixed(2),
      r.discounts.toFixed(2),
      r.refunds.toFixed(2),
      r.net.toFixed(2),
    ]);
    const csv = [head.join(","), ...body.map((r) => r.join(","))].join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const who = employee
    ? report?.employees.find((e) => e.id === employee)?.name ?? "This employee"
    : "the branch";

  return (
    <div className="pos-scroll h-full p-4 space-y-4">
      {/* ─── What is being asked ─── */}
      <section className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${POS.line}` }}>
        <h2 className="text-base font-black" style={{ color: POS.ink }}>
          Sales Performance Report
        </h2>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="Sales source">
            <div className="flex gap-1.5">
              {([
                ["all", "All"],
                ["pos", "Counter"],
                ["kiosk", "Kiosk"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSource(key)}
                  className="rounded-lg px-3 text-[13px] font-bold"
                  style={{
                    height: 40,
                    background: source === key ? POS.action : "#fff",
                    color: source === key ? "#fff" : POS.ink,
                    border: `1px solid ${source === key ? POS.action : POS.line}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {/* Hidden for anyone who only sees their own work — a picker whose
              every option returns the same report is a lie about the screen. */}
          {!report?.restricted && (
            <Field label="Employee">
              <select
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
                className="rounded-lg bg-white px-3 text-[13.5px] font-semibold focus:outline-none"
                style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 40, minWidth: 190 }}
              >
                <option value="">All employees</option>
                {(report?.employees ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.name || e.staff_id}</option>
                ))}
              </select>
            </Field>
          )}

          <Field label="From">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg bg-white px-3 text-[13.5px] font-semibold focus:outline-none"
              style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 40 }}
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              value={to}
              min={from}
              max={today}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg bg-white px-3 text-[13.5px] font-semibold focus:outline-none"
              style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 40 }}
            />
          </Field>

          <Field label="Quick range">
            <div className="flex flex-wrap gap-1.5">
              {([
                ["Today", () => { setFrom(today); setTo(today); }],
                ["7 days", () => { setFrom(daysAgo(6)); setTo(today); }],
                ["30 days", () => { setFrom(daysAgo(29)); setTo(today); }],
                ["This month", () => { setFrom(monthStart()); setTo(today); }],
              ] as const).map(([label, apply]) => (
                <button
                  key={label}
                  onClick={apply}
                  className="rounded-lg px-3 text-[12.5px] font-bold"
                  style={{ height: 40, border: `1px solid ${POS.line}`, color: POS.ink }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex-1" />

          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg px-4 text-[13.5px] font-bold text-white"
            style={{ background: POS.action, height: 40 }}
          >
            <Filter size={15} />
            Apply
          </button>
          <button
            onClick={exportCsv}
            disabled={!report || shown.length === 0}
            className="flex items-center gap-2 rounded-lg px-4 text-[13.5px] font-bold disabled:opacity-40"
            style={{ border: `1px solid ${POS.brand}`, color: POS.brand, height: 40 }}
          >
            <Download size={15} />
            Export
          </button>
        </div>
      </section>

      {loading && !report ? (
        <p className="py-16 text-center text-sm" style={{ color: POS.inkSoft }}>
          Working out the figures…
        </p>
      ) : !report ? (
        <p className="py-16 text-center text-sm" style={{ color: POS.inkSoft }}>
          No report could be loaded.
        </p>
      ) : (
        <>
          <p className="text-[15px] font-black" style={{ color: POS.ink }}>
            {employee ? who : "All employees"} — sales from {pretty(report.from)} to {pretty(report.to)}
          </p>

          {/* ─── The four figures ─── */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={<BarChart3 size={18} />} label="Net sales" value={aed(report.totals.net)} tone={POS.action} />
            <Kpi icon={<ShoppingCart size={18} />} label="Orders" value={String(report.totals.orders)} tone={POS.night} />
            <Kpi icon={<Package size={18} />} label="Items sold" value={String(report.totals.itemsSold)} tone={POS.good} />
            <Kpi
              icon={<PieChart size={18} />}
              label="Sales contribution"
              value={`${report.totals.contribution.toFixed(1)}%`}
              tone={POS.brand}
            />
          </div>

          {/* ─── Everything that sold ─── */}
          <section className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${POS.line}` }}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black" style={{ color: POS.ink }}>
                All items sold {employee ? `by ${who}` : "at the branch"}
              </h2>
              <div className="flex-1" />

              <label
                className="flex items-center gap-2 rounded-lg px-3"
                style={{ border: `1px solid ${POS.line}`, height: 38, minWidth: 200 }}
              >
                <Search size={15} style={{ color: POS.inkSoft }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search item"
                  className="w-full bg-transparent text-[13px] focus:outline-none"
                  style={{ color: POS.ink }}
                />
              </label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg bg-white px-3 text-[13px] font-semibold focus:outline-none"
                style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 38 }}
              >
                <option value="">All categories</option>
                {report.byCategory.map((c) => (
                  <option key={c.category} value={c.category}>{c.category}</option>
                ))}
              </select>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="rounded-lg bg-white px-3 text-[13px] font-semibold focus:outline-none"
                style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 38 }}
              >
                <option value="net">Highest sales</option>
                <option value="qty">Most sold</option>
                <option value="name">Name</option>
              </select>

              <span className="text-[12.5px]" style={{ color: POS.inkSoft }}>
                {shown.length} item{shown.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <div style={{ minWidth: 900 }}>
                <Head />
                {pageRows.length === 0 ? (
                  <p className="py-10 text-center text-[13px]" style={{ color: POS.inkSoft }}>
                    Nothing sold in this range.
                  </p>
                ) : (
                  pageRows.map((row, i) => {
                    const share = shownNet > 0 ? (row.net / shownNet) * 100 : 0;
                    return (
                      <div
                        key={row.name}
                        className="grid items-center gap-2 px-3 py-2.5 text-[13px]"
                        style={{ gridTemplateColumns: COLUMNS, borderBottom: `1px solid ${POS.line}` }}
                      >
                        <span style={{ color: POS.inkSoft }}>{page * PAGE_SIZE + i + 1}</span>
                        <span className="truncate font-bold" style={{ color: POS.ink }}>{row.name}</span>
                        <span>
                          <span
                            className="rounded-md px-2 py-0.5 text-[11.5px] font-semibold"
                            style={{ background: POS.page, color: POS.inkSoft }}
                          >
                            {row.category}
                          </span>
                        </span>
                        <span className="text-end" style={{ color: POS.ink }}>{row.qty}</span>
                        <span className="text-end" style={{ color: POS.inkSoft }}>{row.orders}</span>
                        <span className="text-end" style={{ color: POS.ink }}>{aed(row.gross)}</span>
                        <span className="text-end" style={{ color: row.discounts ? POS.bad : POS.inkSoft }}>
                          {aed(row.discounts)}
                        </span>
                        <span className="text-end" style={{ color: row.refunds ? POS.bad : POS.inkSoft }}>
                          {aed(row.refunds)}
                        </span>
                        <span className="text-end font-bold" style={{ color: POS.ink }}>{aed(row.net)}</span>
                        <span className="text-end font-semibold" style={{ color: POS.inkSoft }}>
                          {share.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })
                )}

                <div
                  className="grid items-center gap-2 px-3 py-2.5 text-[13px] font-black"
                  style={{ gridTemplateColumns: COLUMNS, background: POS.page, color: POS.ink }}
                >
                  <span />
                  <span>Total</span>
                  <span />
                  <span className="text-end">{shown.reduce((n, r) => n + r.qty, 0)}</span>
                  <span className="text-end">{shown.reduce((n, r) => n + r.orders, 0)}</span>
                  <span className="text-end">{aed(shown.reduce((n, r) => n + r.gross, 0))}</span>
                  <span className="text-end">{aed(shown.reduce((n, r) => n + r.discounts, 0))}</span>
                  <span className="text-end">{aed(shown.reduce((n, r) => n + r.refunds, 0))}</span>
                  <span className="text-end">{aed(shownNet)}</span>
                  <span className="text-end">100%</span>
                </div>
              </div>
            </div>

            {pages > 1 && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12.5px]" style={{ color: POS.inkSoft }}>
                  Showing {page * PAGE_SIZE + 1}–{Math.min(shown.length, (page + 1) * PAGE_SIZE)} of{" "}
                  {shown.length}
                </span>
                <span className="flex gap-1.5">
                  <Pager onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                    Previous
                  </Pager>
                  {Array.from({ length: pages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className="h-9 w-9 rounded-lg text-[13px] font-bold"
                      style={{
                        background: page === i ? POS.action : "#fff",
                        color: page === i ? "#fff" : POS.ink,
                        border: `1px solid ${page === i ? POS.action : POS.line}`,
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <Pager onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>
                    Next
                  </Pager>
                </span>
              </div>
            )}
          </section>

          {/* ─── The three panels underneath ─── */}
          <div className="grid gap-3 xl:grid-cols-3">
            <Panel title="Daily sales breakdown" icon={<CalendarDays size={16} />}>
              {report.byDay.length === 0 ? (
                <Empty />
              ) : (
                <div className="overflow-x-auto">
                  <div style={{ minWidth: 420 }}>
                    <div
                      className="grid gap-2 px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wide"
                      style={{ gridTemplateColumns: DAY_COLUMNS, color: POS.inkSoft }}
                    >
                      <span>Date</span>
                      <span className="text-end">Orders</span>
                      <span className="text-end">Items</span>
                      <span className="text-end">Net</span>
                      <span className="text-end">Avg</span>
                    </div>
                    {report.byDay.map((d) => (
                      <div
                        key={d.date}
                        className="grid gap-2 px-1 py-1.5 text-[12.5px]"
                        style={{ gridTemplateColumns: DAY_COLUMNS, borderTop: `1px solid ${POS.line}` }}
                      >
                        <span style={{ color: POS.ink }}>{pretty(d.date)}</span>
                        <span className="text-end" style={{ color: POS.inkSoft }}>{d.orders}</span>
                        <span className="text-end" style={{ color: POS.inkSoft }}>{d.items}</span>
                        <span className="text-end font-semibold" style={{ color: POS.ink }}>{aed(d.net)}</span>
                        <span className="text-end" style={{ color: POS.inkSoft }}>{aed(d.averageOrder)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>

            <Panel title="Performance" icon={<TrendingUp size={16} />}>
              <Highlight icon={<Star size={14} />} label="Top-selling item" value={report.highlights.topSelling || "—"} accent />
              <Highlight icon={<BarChart3 size={14} />} label="Highest income item" value={report.highlights.topEarning || "—"} />
              <Highlight
                icon={<CalendarDays size={14} />}
                label="Best sales day"
                value={report.highlights.bestDay ? pretty(report.highlights.bestDay) : "—"}
              />
              <Highlight icon={<ShoppingCart size={14} />} label="Average order" value={aed(report.totals.averageOrder)} />
              <Highlight icon={<Undo2 size={14} />} label="Refunds" value={aed(report.totals.refunds)} />
              <Highlight icon={<Percent size={14} />} label="Discounts" value={aed(report.totals.discounts)} />
            </Panel>

            <Panel title="Sales by category" icon={<Tag size={16} />}>
              {report.byCategory.length === 0 ? (
                <Empty />
              ) : (
                report.byCategory.map((c) => {
                  const share = report.totals.net > 0 ? (c.net / report.totals.net) * 100 : 0;
                  return (
                    <div key={c.category} className="py-1.5" style={{ borderTop: `1px solid ${POS.line}` }}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[12.5px] font-semibold" style={{ color: POS.ink }}>
                          {c.category}
                        </span>
                        <span className="shrink-0 text-[12.5px] font-bold" style={{ color: POS.ink }}>
                          {aed(c.net)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: POS.page }}>
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${Math.min(100, share)}%`, background: POS.action }}
                          />
                        </span>
                        <span className="w-16 text-end text-[11.5px]" style={{ color: POS.inkSoft }}>
                          {c.qty} · {share.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

const COLUMNS = "44px 1.6fr 130px 80px 70px 110px 100px 100px 110px 80px";
const DAY_COLUMNS = "1.3fr 70px 60px 90px 90px";

function Head() {
  return (
    <div
      className="grid gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wide"
      style={{ gridTemplateColumns: COLUMNS, color: POS.inkSoft, borderBottom: `1px solid ${POS.line}` }}
    >
      <span>Rank</span>
      <span>Item</span>
      <span>Category</span>
      <span className="text-end">Qty</span>
      <span className="text-end">Orders</span>
      <span className="text-end">Gross</span>
      <span className="text-end">Discounts</span>
      <span className="text-end">Refunds</span>
      <span className="text-end">Net sales</span>
      <span className="text-end">Share</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: POS.inkSoft }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl bg-white p-4"
      style={{ border: `1px solid ${POS.line}`, borderLeft: `4px solid ${tone}` }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: POS.page, color: tone }}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold" style={{ color: POS.inkSoft }}>{label}</span>
        <span className="block truncate text-2xl font-black" style={{ color: POS.ink }}>{value}</span>
      </span>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${POS.line}` }}>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold" style={{ color: POS.ink }}>
        <span style={{ color: POS.inkSoft }}>{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Highlight({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 py-1.5"
      style={{ borderTop: `1px solid ${POS.line}` }}
    >
      <span className="flex items-center gap-2 text-[12.5px]" style={{ color: POS.inkSoft }}>
        <span style={{ color: POS.inkSoft }}>{icon}</span>
        {label}
      </span>
      <span
        className="truncate text-[12.5px] font-bold"
        style={{ color: accent ? POS.brand : POS.ink }}
      >
        {value}
      </span>
    </div>
  );
}

function Pager({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-3 text-[13px] font-bold disabled:opacity-35"
      style={{ height: 36, border: `1px solid ${POS.line}`, color: POS.ink }}
    >
      {children}
    </button>
  );
}

function Empty() {
  return (
    <p className="py-8 text-center text-[13px]" style={{ color: POS.inkSoft }}>
      Nothing in this range.
    </p>
  );
}
