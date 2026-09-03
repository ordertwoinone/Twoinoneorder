"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Check,
  CircleDot,
  Lock,
  Printer,
  Users,
} from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed } from "@/lib/pos/cart";
import type { PosStaff } from "@/lib/pos/constants";
import { can } from "@/lib/pos/permissions";
import type { DayShift, DayTotals } from "@/lib/pos/business-day";
import { businessDateLabel } from "@/lib/pos/business-day";
import PosShell from "@/components/pos/PosShell";

/**
 * Day Close — the restaurant, not a person.
 *
 * Every shift that traded today, side by side, and the one question that has to
 * be answered before the day can be signed off: is anybody still open? A day
 * closed over a running shift is a total that is short by exactly one cashier's
 * takings and looks entirely plausible, which is the worst kind of wrong figure
 * to produce — so the button stays disabled and names whoever is still in.
 *
 * The figures are the shifts added up, not the orders recounted. Each shift
 * froze its own numbers when it was closed, so the morning's takings appear in
 * the day exactly as the morning cashier signed them off, and appear once.
 */

interface DayState {
  date: string;
  label: string;
  shifts: DayShift[];
  totals: DayTotals;
  openShifts: DayShift[];
  closedDay: { closed_at: string; report: string; difference: number | string } | null;
  missed: string[];
}

export default function DayCloseScreen({ staff }: { staff: PosStaff }) {
  const router = useRouter();
  const [day, setDay] = useState<DayState | null>(null);
  const [date, setDate] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ report: string; whatsappUrl: string; totals: DayTotals } | null>(null);

  const load = useCallback(async (forDate?: string) => {
    const query = forDate ? `?date=${forDate}` : "";
    const res = await fetch(`/api/pos/day${query}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (body?.date) {
      setDay(body as DayState);
      setDate(body.date as string);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const canClose = can(staff, "day_close");

  async function closeDay() {
    setBusy(true);
    setError("");

    const res = await fetch("/api/pos/day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, note }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok) {
      setError(body?.error || "Could not close the business day.");
      // Whatever refused it — a shift reopened, another manager got there
      // first — the screen has to show the state that refused, not the old one.
      load(date);
      return;
    }
    setDone({ report: body.report, whatsappUrl: body.whatsappUrl, totals: body.totals });
  }

  /* ─── Signed off ─── */
  if (done) {
    return (
      <PosShell staff={staff} title="Day Close" subtitle="Business day closed">
        <div className="pos-scroll h-full flex items-center justify-center p-6">
          <div
            className="w-full max-w-[560px] rounded-2xl bg-white p-7 text-center"
            style={{ border: `1px solid ${POS.line}` }}
          >
            <span
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: POS.goodSoft }}
            >
              <Check size={28} strokeWidth={3} style={{ color: POS.good }} />
            </span>
            <h2 className="mt-3 text-2xl font-black" style={{ color: POS.ink }}>
              Business day closed
            </h2>
            <p className="mt-1 text-sm" style={{ color: POS.inkSoft }}>
              {businessDateLabel(date)} · {done.totals.shiftCount} shift
              {done.totals.shiftCount === 1 ? "" : "s"} · {aed(done.totals.netSales)} net
            </p>
            <p className="mt-1 text-[12.5px]" style={{ color: POS.inkSoft }}>
              The next order starts a new business day.
            </p>

            <pre
              className="mt-4 max-h-[38vh] overflow-auto whitespace-pre-wrap rounded-xl p-4 text-left text-[12.5px] leading-relaxed"
              style={{ background: POS.page, color: POS.ink }}
            >
              {done.report}
            </pre>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl text-sm font-bold"
                style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 48 }}
              >
                <Printer size={16} />
                Print
              </button>
              {done.whatsappUrl ? (
                <a
                  href={done.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ background: "#25D366", height: 48 }}
                >
                  Send on WhatsApp
                </a>
              ) : (
                <button
                  onClick={() => navigator.clipboard?.writeText(done.report)}
                  className="flex-1 rounded-xl text-sm font-bold"
                  style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 48 }}
                >
                  Copy report
                </button>
              )}
              <button
                onClick={() => { router.replace("/pos/login"); router.refresh(); }}
                className="flex-1 rounded-xl text-sm font-bold text-white"
                style={{ background: POS.action, height: 48 }}
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      </PosShell>
    );
  }

  const totals = day?.totals;
  const open = day?.openShifts ?? [];
  const alreadyClosed = Boolean(day?.closedDay);

  return (
    <PosShell
      staff={staff}
      title="Day Close"
      subtitle={day ? `${day.label} · the whole restaurant's day` : "Working out the day…"}
    >
      <div className="pos-scroll h-full p-4">
        {/* A day before this one that was traded and never signed off. */}
        {(day?.missed?.length ?? 0) > 0 && (
          <div
            className="mb-4 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}
          >
            <AlertTriangle size={16} style={{ color: POS.warn }} />
            <span className="text-[13px] font-semibold" style={{ color: "#9A3412" }}>
              {day!.missed.length === 1 ? "A day was" : `${day!.missed.length} days were`} never
              closed off:
            </span>
            {day!.missed.map((d) => (
              <button
                key={d}
                onClick={() => { setError(""); load(d); }}
                className="rounded-lg px-3 py-1.5 text-[12.5px] font-bold"
                style={{ background: "#fff", border: "1px solid #FED7AA", color: "#9A3412" }}
              >
                {businessDateLabel(d)}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          {/* ─── Who worked, and what each drawer did ─── */}
          <Card title="Shifts on this day" icon={<Users size={16} />}>
            {!day ? (
              <p className="text-[13px]" style={{ color: POS.inkSoft }}>Working it out…</p>
            ) : day.shifts.length === 0 ? (
              <p className="text-[13px]" style={{ color: POS.inkSoft }}>
                Nothing was traded on {day.label}.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${POS.line}` }}>
                <div
                  className="grid gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wide"
                  style={{
                    gridTemplateColumns: "1.4fr 1fr 110px 110px 110px",
                    color: POS.inkSoft,
                    borderBottom: `1px solid ${POS.line}`,
                  }}
                >
                  <span>Cashier</span>
                  <span>Shift</span>
                  <span className="text-end">Net sales</span>
                  <span className="text-end">Cash</span>
                  <span className="text-end">Difference</span>
                </div>

                {day.shifts.map((s) => (
                  <div
                    key={s.id}
                    className="grid items-center gap-2 px-3 py-2.5"
                    style={{
                      gridTemplateColumns: "1.4fr 1fr 110px 110px 110px",
                      borderBottom: `1px solid ${POS.line}`,
                      background: s.status === "open" ? "#FFFBEB" : "transparent",
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-bold" style={{ color: POS.ink }}>
                        {s.staff_name}
                      </span>
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: s.status === "open" ? POS.warn : POS.inkSoft }}>
                        {s.status === "open" && <CircleDot size={10} />}
                        {s.status === "open" ? "still open" : "closed"}
                      </span>
                    </span>
                    <span className="text-[12.5px]" style={{ color: POS.inkSoft }}>
                      {s.shift_label} · {clock(s.opened_at)}–{s.closed_at ? clock(s.closed_at) : "…"}
                    </span>
                    <span className="text-end text-[13px] font-semibold" style={{ color: POS.ink }}>
                      {s.status === "open" ? "—" : aed(s.net_sales)}
                    </span>
                    <span className="text-end text-[13px]" style={{ color: POS.inkSoft }}>
                      {s.status === "open" ? "—" : aed(s.cash_sales)}
                    </span>
                    <span
                      className="text-end text-[13px] font-bold"
                      style={{
                        color: s.status === "open" ? POS.inkSoft : s.difference === 0 ? POS.good : POS.bad,
                      }}
                    >
                      {s.status === "open"
                        ? "—"
                        : s.difference === 0
                          ? "Balanced"
                          : `${s.difference > 0 ? "+" : "−"}${aed(Math.abs(s.difference))}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ─── The day's combined figures ─── */}
            {totals && totals.shiftCount > 0 && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wide" style={{ color: POS.inkSoft }}>
                    All shifts combined
                  </p>
                  <Row label="Gross sales" value={aed(totals.grossSales)} />
                  <Row label="Discounts" value={`− ${aed(totals.discountTotal)}`} tone={POS.bad} />
                  <Row label="Refunds" value={`− ${aed(totals.refundTotal)}`} tone={POS.bad} />
                  <Row label="VAT (included)" value={aed(totals.vatTotal)} muted />
                  <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${POS.line}` }}>
                    <p className="text-[11.5px]" style={{ color: POS.inkSoft }}>Net sales for the day</p>
                    <p className="text-3xl font-black" style={{ color: POS.ink }}>{aed(totals.netSales)}</p>
                    <p className="mt-1 text-[12px]" style={{ color: POS.inkSoft }}>
                      {totals.orderCount} order{totals.orderCount === 1 ? "" : "s"} across{" "}
                      {totals.shiftCount} shift{totals.shiftCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wide" style={{ color: POS.inkSoft }}>
                    Payment breakdown
                  </p>
                  <Row label="Cash" value={aed(totals.cashSales)} />
                  <Row label="Card" value={aed(totals.cardSales)} />
                  <Row label="Online" value={aed(totals.onlineSales)} />
                  {totals.expenseTotal > 0 && (
                    <Row label="Expenses paid out" value={`− ${aed(totals.expenseTotal)}`} tone={POS.bad} />
                  )}
                  <div className="mt-2 pt-2 space-y-0.5" style={{ borderTop: `1px solid ${POS.line}` }}>
                    <Row label="Expected in drawers" value={aed(totals.expectedCash)} />
                    <Row label="Counted across shifts" value={aed(totals.countedCash)} />
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* ─── Signing it off ─── */}
          <Card title="Sign the day off" icon={<BarChart3 size={16} />}>
            {alreadyClosed ? (
              <>
                <div className="rounded-xl px-3 py-3" style={{ background: POS.goodSoft }}>
                  <p className="text-[13px] font-bold" style={{ color: POS.good }}>
                    Already closed
                  </p>
                  <p className="mt-0.5 text-[12px]" style={{ color: POS.inkSoft }}>
                    Signed off {clock(day!.closedDay!.closed_at)} on {day!.label}.
                  </p>
                </div>
                <pre
                  className="mt-3 max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-xl p-3 text-[12px] leading-relaxed"
                  style={{ background: POS.page, color: POS.ink }}
                >
                  {day!.closedDay!.report}
                </pre>
                <button
                  onClick={() => window.print()}
                  className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl text-sm font-bold"
                  style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 48 }}
                >
                  <Printer size={16} />
                  Reprint the report
                </button>
              </>
            ) : (
              <>
                {totals && (
                  <div
                    className="rounded-xl px-3 py-3 flex items-center justify-between"
                    style={{ background: totals.difference === 0 ? POS.goodSoft : POS.badSoft }}
                  >
                    <span
                      className="text-[13px] font-bold"
                      style={{ color: totals.difference === 0 ? POS.good : POS.bad }}
                    >
                      {totals.difference === 0 ? "Drawers balanced" : totals.difference > 0 ? "Over" : "Short"}
                    </span>
                    {totals.difference !== 0 && (
                      <span className="text-xl font-black" style={{ color: POS.bad }}>
                        {totals.difference > 0 ? "+" : "−"}
                        {aed(Math.abs(totals.difference))}
                      </span>
                    )}
                  </div>
                )}

                {/* The one thing that has to be true before the day can close. */}
                {open.length > 0 && (
                  <div
                    className="rounded-xl px-3 py-3"
                    style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
                  >
                    <p className="flex items-center gap-2 text-[13px] font-bold" style={{ color: "#92400E" }}>
                      <AlertTriangle size={15} />
                      {open.length === 1 ? "A shift is still open" : `${open.length} shifts are still open`}
                    </p>
                    <p className="mt-1 text-[12px]" style={{ color: "#92400E" }}>
                      {open.map((s) => s.staff_name).join(", ")} must close{" "}
                      {open.length === 1 ? "their drawer" : "their drawers"} first. Their takings
                      are not in the figures above.
                    </p>
                  </div>
                )}

                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Note for the day (optional)"
                  className="w-full resize-none rounded-lg px-3 py-2 text-[13px] focus:outline-none"
                  style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
                />

                {!canClose && (
                  <p
                    className="rounded-lg px-3 py-2.5 text-[12px] font-semibold"
                    style={{ background: POS.badSoft, color: POS.bad }}
                  >
                    A manager signs the business day off. Ask one to sign in.
                  </p>
                )}

                {error && (
                  <p
                    className="rounded-lg px-3 py-2.5 text-[12px] font-semibold"
                    style={{ background: POS.badSoft, color: POS.bad }}
                  >
                    {error}
                  </p>
                )}

                <button
                  onClick={closeDay}
                  disabled={busy || !canClose || open.length > 0 || !totals || totals.shiftCount === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white disabled:opacity-40"
                  style={{ background: POS.night, height: 52 }}
                >
                  <Lock size={16} />
                  {busy ? "Closing…" : "Close business day"}
                </button>

                <p className="text-[11.5px]" style={{ color: POS.inkSoft }}>
                  This confirms the day&apos;s report and locks it. The next order starts a new
                  business day.
                </p>
              </>
            )}
          </Card>
        </div>
      </div>
    </PosShell>
  );
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 space-y-2" style={{ border: `1px solid ${POS.line}` }}>
      <h2 className="flex items-center gap-2 text-sm font-bold" style={{ color: POS.ink }}>
        <span style={{ color: POS.inkSoft }}>{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value, tone, muted }: { label: string; value: string; tone?: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="text-[12.5px]" style={{ color: POS.inkSoft }}>{label}</span>
      <span className="text-[13px] font-semibold" style={{ color: tone ?? (muted ? POS.inkSoft : POS.ink) }}>
        {value}
      </span>
    </div>
  );
}
