"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, MonitorSmartphone, ShoppingCart, TrendingUp } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed } from "@/lib/pos/cart";
import type { PosStaff } from "@/lib/pos/constants";
import PosShell from "@/components/pos/PosShell";
import SalesPerformance from "./SalesPerformance";
import ShiftCloses from "./ShiftCloses";

/**
 * What the branch has been taking.
 *
 * Read from the orders rather than from closed shifts, so today counts before
 * anyone has closed anything — which is the day a manager actually wants to
 * look at. Kiosk and till are added together and also shown apart, because
 * "are people using the screen" is a different question from "how did we do".
 *
 * Two reports behind two tabs. Overview is the branch at a glance over a few
 * days; Sales Performance is the detailed one — per employee, per item, per
 * category, over any range, exportable. They are separate because they answer
 * different questions and share almost no controls: one has three buttons, the
 * other has a filter bar.
 */

type Tab = "overview" | "sales" | "closes";

interface Report {
  days: number;
  orders: number;
  sales: number;
  discounts: number;
  refunds: number;
  averageOrder: number;
  byDay: { date: string; orders: number; sales: number }[];
  byPayment: { cash: number; card: number; online: number };
  bySource: { pos: number; kiosk: number };
  topDishes: { name: string; qty: number; sales: number }[];
}

const RANGES = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
] as const;

export default function ReportsScreen({ staff }: { staff: PosStaff }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [days, setDays] = useState(7);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (range: number) => {
    setLoading(true);
    const res = await fetch(`/api/pos/reports?days=${range}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (body && !body.error) setReport(body as Report);
    setLoading(false);
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  const peak = Math.max(1, ...(report?.byDay ?? []).map((d) => d.sales));

  return (
    <PosShell
      staff={staff}
      title="Reports"
      subtitle={report ? `${report.orders} orders over ${report.days} day${report.days === 1 ? "" : "s"}` : "Loading"}
      actions={
        <div className="flex gap-2">
          {/* Only Overview takes a day range. Sales Performance has its own
              from/to inside it, and two competing range pickers on one screen
              is a report nobody can tell the shape of. */}
          {tab === "overview" &&
            RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className="rounded-lg px-3 py-2 text-[13px] font-bold"
                style={{
                  background: days === r.days ? POS.night : "#fff",
                  color: days === r.days ? "#fff" : POS.inkSoft,
                  border: `1px solid ${days === r.days ? POS.night : POS.line}`,
                }}
              >
                {r.label}
              </button>
            ))}
        </div>
      }
    >
      {/* ─── Which report ─── */}
      <div
        className="pos-chrome shrink-0 flex gap-1 bg-white px-4"
        style={{ borderBottom: `1px solid ${POS.line}` }}
      >
        {([
          ["overview", "Overview"],
          ["sales", "Sales Performance"],
          ["closes", "Shift Closes"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-3 py-3 text-[13.5px] font-bold"
            style={{
              color: tab === key ? POS.brand : POS.inkSoft,
              borderBottom: `2.5px solid ${tab === key ? POS.brand : "transparent"}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "sales" ? (
        <SalesPerformance />
      ) : tab === "closes" ? (
        <ShiftCloses />
      ) : (
      <div className="pos-scroll h-full p-4">
        {loading && !report ? (
          <p className="py-16 text-center text-sm" style={{ color: POS.inkSoft }}>Working it out…</p>
        ) : !report ? (
          <p className="py-16 text-center text-sm" style={{ color: POS.inkSoft }}>Nothing to report.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4 mb-4">
              <Stat label="Net sales" value={aed(report.sales)} icon={<TrendingUp size={17} />} big />
              <Stat label="Orders" value={String(report.orders)} icon={<ShoppingCart size={17} />} />
              <Stat label="Average order" value={aed(report.averageOrder)} icon={<BarChart3 size={17} />} />
              <Stat
                label="Discounts given"
                value={aed(report.discounts)}
                icon={<BarChart3 size={17} />}
                tone={report.discounts > 0 ? POS.warn : undefined}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
              {/* ─── Day by day ─── */}
              <section className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${POS.line}` }}>
                <h2 className="mb-3 text-sm font-bold" style={{ color: POS.ink }}>Sales by day</h2>
                {report.byDay.length === 0 ? (
                  <p className="py-8 text-center text-[13px]" style={{ color: POS.inkSoft }}>No sales yet.</p>
                ) : (
                  <div className="space-y-2">
                    {report.byDay.map((d) => (
                      <div key={d.date} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-[12px]" style={{ color: POS.inkSoft }}>
                          {new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </span>
                        {/* A bar, not a chart library: one number per day, read at
                            a glance, and nothing to load. */}
                        <span className="flex-1 h-6 rounded" style={{ background: POS.page }}>
                          <span
                            className="block h-full rounded"
                            style={{ width: `${(d.sales / peak) * 100}%`, background: POS.action, minWidth: 2 }}
                          />
                        </span>
                        <span className="w-24 shrink-0 text-end text-[12.5px] font-bold" style={{ color: POS.ink }}>
                          {aed(d.sales)}
                        </span>
                        <span className="w-16 shrink-0 text-end text-[11.5px]" style={{ color: POS.inkSoft }}>
                          {d.orders} ord
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <h2 className="mt-5 mb-3 text-sm font-bold" style={{ color: POS.ink }}>Best sellers</h2>
                {report.topDishes.length === 0 ? (
                  <p className="text-[13px]" style={{ color: POS.inkSoft }}>Nothing sold yet.</p>
                ) : (
                  <table className="w-full text-[13px]">
                    <tbody>
                      {report.topDishes.map((d, i) => (
                        <tr key={d.name} style={{ borderTop: i === 0 ? "none" : `1px solid ${POS.line}` }}>
                          <td className="py-1.5 font-semibold" style={{ color: POS.ink }}>{d.name}</td>
                          <td className="py-1.5 text-end" style={{ color: POS.inkSoft }}>{d.qty} sold</td>
                          <td className="py-1.5 text-end font-bold" style={{ color: POS.ink }}>{aed(d.sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              {/* ─── Split ─── */}
              <div className="space-y-4">
                <section className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${POS.line}` }}>
                  <h2 className="mb-3 text-sm font-bold" style={{ color: POS.ink }}>How it was paid</h2>
                  <Split label="Cash" value={report.byPayment.cash} total={report.sales} colour={POS.good} />
                  <Split label="Card" value={report.byPayment.card} total={report.sales} colour="#2563EB" />
                  <Split label="Online" value={report.byPayment.online} total={report.sales} colour="#7C3AED" />
                </section>

                <section className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${POS.line}` }}>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-bold" style={{ color: POS.ink }}>
                    <MonitorSmartphone size={15} style={{ color: POS.inkSoft }} />
                    Where it was ordered
                  </h2>
                  <Split label="At the till" value={report.bySource.pos} total={report.sales} colour={POS.night} />
                  <Split label="On the kiosk" value={report.bySource.kiosk} total={report.sales} colour={POS.brand} />
                </section>
              </div>
            </div>
          </>
        )}
      </div>
      )}
    </PosShell>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
  big,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: string;
  big?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-3.5 flex items-center gap-3" style={{ border: `1px solid ${POS.line}` }}>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: POS.page, color: tone ?? POS.inkSoft }}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[11.5px]" style={{ color: POS.inkSoft }}>{label}</span>
        <span
          className={`block font-black truncate ${big ? "text-xl" : "text-lg"}`}
          style={{ color: tone ?? POS.ink }}
        >
          {value}
        </span>
      </span>
    </div>
  );
}

function Split({ label, value, total, colour }: { label: string; value: number; total: number; colour: string }) {
  const share = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="mb-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[12.5px]" style={{ color: POS.inkSoft }}>{label}</span>
        <span className="text-[13px] font-bold" style={{ color: POS.ink }}>
          {aed(value)} <span className="text-[11px] font-semibold" style={{ color: POS.inkSoft }}>{share}%</span>
        </span>
      </div>
      <span className="mt-1 block h-1.5 rounded-full" style={{ background: POS.page }}>
        <span className="block h-full rounded-full" style={{ width: `${share}%`, background: colour, minWidth: share > 0 ? 3 : 0 }} />
      </span>
    </div>
  );
}
