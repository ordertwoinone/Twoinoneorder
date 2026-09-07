"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Filter, Receipt, Wallet } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed } from "@/lib/pos/cart";
import { addBusinessDays, businessDateFor, businessDateLabel } from "@/lib/pos/business-day";

/**
 * What the branch paid out, over any stretch of days.
 *
 * The expenses screen shows the shift you are standing on, which is right for
 * recording one and no use at all for asking what was spent last month. The
 * figure was inside every close and itemised in none of them.
 *
 * Cash is called out on its own throughout: it is the only kind that came out
 * of a drawer, which is why a shift close deducts it and leaves a card payment
 * alone.
 */

interface Expense {
  id: string;
  spentAt: string;
  businessDate: string;
  shiftLabel: string;
  staff: string;
  category: string;
  description: string;
  supplier: string;
  reference: string;
  amount: number;
  method: string;
  vatIncluded: boolean;
  vat: number;
  /** Nobody typed a figure; 5/105 was assumed. */
  vatAssumed: boolean;
  approvedBy: string;
  receiptUrl: string;
  note: string;
}

interface Report {
  from: string;
  to: string;
  totals: {
    count: number;
    total: number;
    cash: number;
    card: number;
    transfer: number;
    vat: number;
    vatEstimated: number;
    unapproved: number;
  };
  byCategory: { category: string; count: number; total: number }[];
  expenses: Expense[];
}

const CONTROL = { height: 48, borderColor: POS.line, color: POS.ink } as const;
const SELECT =
  "rounded-xl border bg-white px-3.5 text-[14.5px] font-semibold focus:outline-none";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  transfer: "Transfer",
};

function clock(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function Expenses() {
  const today = businessDateFor();

  const [period, setPeriod] = useState<"today" | "7" | "30" | "month" | "custom">("30");
  const [from, setFrom] = useState(addBusinessDays(today, -29));
  const [to, setTo] = useState(today);
  const [category, setCategory] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  const apply = useCallback(async (next?: { from?: string; to?: string }) => {
    const q = { from: next?.from ?? from, to: next?.to ?? to };
    setLoading(true);
    const res = await fetch(`/api/pos/reports/expenses?from=${q.from}&to=${q.to}`, {
      cache: "no-store",
    });
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

  /* The category filter is applied here rather than re-fetched: the rows are
     already in hand, and narrowing to "Kitchen Supplies" is a question about
     the same window, not a different one. */
  const shown = (report?.expenses ?? []).filter((e) => !category || e.category === category);
  const shownTotal = shown.reduce((sum, e) => sum + e.amount, 0);

  function exportCsv() {
    const head = [
      "Date", "Time", "Shift", "Recorded by", "Category", "Description", "Supplier",
      "Reference", "Method", "Amount", "VAT", "VAT assumed", "Approved by", "Receipt", "Note",
    ];
    const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body = shown.map((e) => [
      e.businessDate, clock(e.spentAt), quote(e.shiftLabel), quote(e.staff),
      quote(e.category), quote(e.description), quote(e.supplier), quote(e.reference),
      METHOD_LABEL[e.method] ?? e.method, e.amount.toFixed(2),
      e.vat.toFixed(2), e.vatAssumed ? "yes" : "no",
      quote(e.approvedBy), e.receiptUrl ? "yes" : "no", quote(e.note),
    ]);
    const csv = [head.join(","), ...body.map((r) => r.join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const t = report?.totals;

  return (
    <div className="pos-scroll h-full space-y-4 p-4">
      <section className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${POS.line}` }}>
        <h2 className="text-base font-black" style={{ color: POS.ink }}>Expense History</h2>
        <p className="mt-0.5 text-[12.5px]" style={{ color: POS.inkSoft }}>
          Everything paid out, by day, category and who recorded it. Cash is the only kind that
          came out of a drawer.
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
                else if (next === "month") preset(`${today.slice(0, 8)}01`, today);
              }}
              className={SELECT}
              style={{ ...CONTROL, minWidth: 190 }}
            >
              <option value="today">Today</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="month">This month</option>
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

          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={SELECT}
              style={{ ...CONTROL, minWidth: 180 }}
            >
              <option value="">All categories</option>
              {(report?.byCategory ?? []).map((c) => (
                <option key={c.category} value={c.category}>{c.category}</option>
              ))}
            </select>
          </Field>

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
            disabled={shown.length === 0}
            className="flex items-center gap-2 rounded-xl border px-4 text-[14px] font-bold disabled:opacity-40"
            style={{ height: 48, borderColor: POS.brand, color: POS.brand }}
          >
            <Download size={15} />
            Export
          </button>
        </div>
      </section>

      {loading && !report ? (
        <p className="py-16 text-center text-sm" style={{ color: POS.inkSoft }}>Working it out…</p>
      ) : !t ? (
        <p className="py-16 text-center text-sm" style={{ color: POS.inkSoft }}>Nothing to report.</p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Paid out" value={aed(t.total)} hint={`${t.count} expense${t.count === 1 ? "" : "s"}`} />
            <Tile label="Out of the drawer" value={aed(t.cash)} hint="cash only" tone={POS.bad} />
            <Tile label="Card & transfer" value={aed(t.card + t.transfer)} hint="never touched the till" />
            <Tile
              label="VAT included"
              value={aed(t.vat)}
              hint={
                t.vatEstimated > 0
                  ? `${t.vatEstimated} assumed at 5%`
                  : t.unapproved > 0
                    ? `${t.unapproved} unapproved`
                    : "as stated on the invoices"
              }
              tone={t.vatEstimated > 0 ? POS.warn : undefined}
            />
          </section>

          {report.byCategory.length > 0 && (
            <section className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${POS.line}` }}>
              <h3 className="mb-2.5 flex items-center gap-2 text-sm font-black" style={{ color: POS.ink }}>
                <Wallet size={15} style={{ color: POS.inkSoft }} />
                Where it went
              </h3>
              <div className="space-y-2">
                {report.byCategory.map((c) => {
                  const share = t.total > 0 ? (c.total / t.total) * 100 : 0;
                  return (
                    <div key={c.category} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-[12.5px] font-semibold" style={{ color: POS.ink }}>
                        {c.category}
                      </span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: POS.page }}>
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${Math.min(100, share)}%`, background: POS.action }}
                        />
                      </span>
                      <span className="w-12 shrink-0 text-end text-[12px] font-bold tabular-nums" style={{ color: POS.inkSoft }}>
                        {share.toFixed(0)}%
                      </span>
                      <span className="w-24 shrink-0 text-end text-[12.5px] font-black tabular-nums" style={{ color: POS.ink }}>
                        {aed(c.total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl bg-white" style={{ border: `1px solid ${POS.line}` }}>
            <div className="flex flex-wrap items-baseline gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${POS.line}` }}>
              <h3 className="flex items-center gap-2 text-sm font-black" style={{ color: POS.ink }}>
                <Receipt size={15} style={{ color: POS.inkSoft }} />
                {category || "Every expense"}
              </h3>
              <span className="text-[12.5px]" style={{ color: POS.inkSoft }}>
                {businessDateLabel(report.from)} — {businessDateLabel(report.to)}
              </span>
              <span className="ms-auto text-[13px] font-black" style={{ color: POS.ink }}>
                {shown.length} · {aed(shownTotal)}
              </span>
            </div>

            {shown.length === 0 ? (
              <p className="py-14 text-center text-[13px]" style={{ color: POS.inkSoft }}>
                Nothing was paid out {category ? `under ${category} ` : ""}in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]" style={{ minWidth: 1040 }}>
                  <thead>
                    <tr style={{ background: POS.page, color: POS.inkSoft }}>
                      {["Date", "Category", "Description", "Supplier", "Recorded by", "Method", "Amount"].map((h, i) => (
                        <th
                          key={h}
                          className={`px-3 py-2.5 text-[10.5px] font-black uppercase tracking-wide ${i === 6 ? "text-right" : "text-left"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((e) => (
                      <tr key={e.id} style={{ borderTop: `1px solid ${POS.line}` }}>
                        <td className="px-3 py-2.5" style={{ color: POS.ink }}>
                          {e.businessDate ? businessDateLabel(e.businessDate) : "—"}
                          <span className="block text-[10.5px]" style={{ color: POS.inkSoft }}>
                            {clock(e.spentAt)}{e.shiftLabel ? ` · ${e.shiftLabel}` : ""}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-semibold" style={{ color: POS.ink }}>{e.category}</td>
                        <td className="px-3 py-2.5" style={{ color: POS.inkSoft }}>
                          {e.description || "—"}
                          {e.reference && (
                            <span className="block text-[10.5px]" style={{ color: "#1D4ED8" }}>{e.reference}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5" style={{ color: POS.inkSoft }}>{e.supplier || "—"}</td>
                        <td className="px-3 py-2.5" style={{ color: POS.inkSoft }}>
                          {e.staff || "—"}
                          {/* Blank approval is only possible below the manager
                              threshold, and is the thing an audit asks about. */}
                          {!e.approvedBy && (
                            <span className="block text-[10.5px] font-bold" style={{ color: POS.warn }}>
                              not approved
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="rounded-md px-2 py-0.5 text-[11px] font-bold"
                            style={{
                              background: e.method === "cash" ? POS.badSoft : POS.page,
                              color: e.method === "cash" ? POS.bad : POS.inkSoft,
                            }}
                          >
                            {METHOD_LABEL[e.method] ?? e.method}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="text-[13px] font-black tabular-nums" style={{ color: POS.ink }}>
                            {aed(e.amount)}
                          </span>
                          {/* What is reclaimable on this line. Flagged when it
                              was assumed rather than typed off an invoice. */}
                          {e.vat > 0 && (
                            <span
                              className="block text-[10px]"
                              style={{ color: e.vatAssumed ? POS.warn : POS.inkSoft }}
                            >
                              VAT {aed(e.vat)}{e.vatAssumed ? " (assumed)" : ""}
                            </span>
                          )}
                          {e.receiptUrl && (
                            <a
                              href={e.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-[10.5px] font-bold underline"
                              style={{ color: "#1D4ED8" }}
                            >
                              receipt
                            </a>
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
