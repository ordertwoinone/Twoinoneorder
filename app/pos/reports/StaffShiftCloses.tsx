"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Camera,
  CameraOff,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  UserRound,
} from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed } from "@/lib/pos/cart";
import {
  addBusinessDays,
  businessDateFor,
  businessDateLabel,
} from "@/lib/pos/business-day";

/**
 * Shift closes, by the person who worked them.
 *
 * The Shift Closes grid answers "show me the last closes"; this answers "how
 * has this cashier's drawer behaved". They are the same rows read the other way
 * round, which is why they share a route rather than a query.
 *
 * A day is one row per person, not one row per shift. Somebody who closed a
 * morning and came back for an evening worked one day, and reading their two
 * closes as two unrelated lines is what made a broken-up day look like one
 * shift had gone missing — the totals here are always the sum of everything
 * they closed that day, with the individual closes underneath when they are
 * wanted.
 *
 * Every figure is the one frozen onto the shift row at its own close. Nothing
 * is recounted from the orders: a refund next week must not move a number a
 * cashier has already signed for.
 */

interface ShiftRow {
  id: string;
  staffKey: string;
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
  cashSales: number;
  cardSales: number;
  onlineSales: number;
  expenseTotal: number;
  orderCount: number;
  note: string;
  photo: string;
}

/** The figures that add up the same way at every level of the table. */
interface Totals {
  shifts: number;
  orders: number;
  net: number;
  cash: number;
  card: number;
  online: number;
  expenses: number;
  expected: number;
  counted: number;
  difference: number;
}

interface DayGroup {
  date: string;
  shifts: ShiftRow[];
  totals: Totals;
}

interface StaffGroup {
  key: string;
  name: string;
  days: DayGroup[];
  totals: Totals;
}

const CONTROL = { height: 48, borderColor: POS.line, color: POS.ink } as const;
const SELECT =
  "rounded-xl border bg-white px-3.5 text-[14.5px] font-semibold focus:outline-none";

/* Money is added in fils and divided back at the end. Adding a column of
   two-decimal floats and rounding once at the bottom drifts by a fil every few
   hundred rows, which on a report headed "difference" is the one place a stray
   fil gets read as a real discrepancy. */
const fils = (n: number) => Math.round((Number(n) || 0) * 100);
const money = (f: number) => f / 100;

function emptyFils(): Record<keyof Totals, number> {
  return { shifts: 0, orders: 0, net: 0, cash: 0, card: 0, online: 0, expenses: 0, expected: 0, counted: 0, difference: 0 };
}

function addShift(acc: Record<keyof Totals, number>, s: ShiftRow) {
  acc.shifts += 1;
  acc.orders += Math.round(s.orderCount) || 0;
  acc.net += fils(s.netSales);
  acc.cash += fils(s.cashSales);
  acc.card += fils(s.cardSales);
  acc.online += fils(s.onlineSales);
  acc.expenses += fils(s.expenseTotal);
  acc.expected += fils(s.expectedCash);
  acc.counted += fils(s.countedCash);
  /* Summed from the shifts' own differences rather than recomputed as
     counted − expected. They are the same number today; they stop being the
     same number the moment one shift closed before a column existed and reads
     back as zero, and the figure the cashier signed is the one that counts. */
  acc.difference += fils(s.difference);
}

function toTotals(acc: Record<keyof Totals, number>): Totals {
  return {
    shifts: acc.shifts,
    orders: acc.orders,
    net: money(acc.net),
    cash: money(acc.cash),
    card: money(acc.card),
    online: money(acc.online),
    expenses: money(acc.expenses),
    expected: money(acc.expected),
    counted: money(acc.counted),
    difference: money(acc.difference),
  };
}

function clock(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function StaffShiftCloses() {
  const today = businessDateFor();

  const [period, setPeriod] = useState<"7" | "30" | "month" | "custom">("7");
  const [from, setFrom] = useState(addBusinessDays(today, -6));
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<ShiftRow | null>(null);

  const apply = useCallback(async (next?: { from?: string; to?: string }) => {
    const q = { from: next?.from ?? from, to: next?.to ?? to };
    setLoading(true);
    const res = await fetch(`/api/pos/reports/shifts?from=${q.from}&to=${q.to}`, {
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    setRows(Array.isArray(body?.shifts) ? (body.shifts as ShiftRow[]) : []);
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

  /* Grouped once per fetch rather than on every expand: the table redraws each
     time a day is opened, and regrouping a month of shifts to do it is work
     nobody asked for. */
  const groups: StaffGroup[] = useMemo(() => {
    const byStaff = new Map<string, { name: string; days: Map<string, ShiftRow[]> }>();

    for (const row of rows) {
      /* Keyed on the uuid, labelled with the name. Two people called Mohammed
         is an ordinary Tuesday here, and grouping on the name would add their
         drawers together and blame one of them for the other's difference. */
      const key = row.staffKey || row.openedBy;
      const entry = byStaff.get(key) ?? { name: row.openedBy, days: new Map<string, ShiftRow[]>() };
      const day = entry.days.get(row.businessDate) ?? [];
      day.push(row);
      entry.days.set(row.businessDate, day);
      byStaff.set(key, entry);
    }

    const out: StaffGroup[] = [];
    for (const [key, entry] of Array.from(byStaff.entries())) {
      const staffAcc = emptyFils();
      const days: DayGroup[] = [];

      // Most recent day first; the shifts inside one day read in worked order.
      const dates = Array.from(entry.days.keys()).sort().reverse();
      for (const date of dates) {
        const shifts = (entry.days.get(date) ?? [])
          .slice()
          .sort((a, b) => a.openedAt.localeCompare(b.openedAt));
        const dayAcc = emptyFils();
        for (const s of shifts) {
          addShift(dayAcc, s);
          addShift(staffAcc, s);
        }
        days.push({ date, shifts, totals: toTotals(dayAcc) });
      }

      out.push({ key, name: entry.name, days, totals: toTotals(staffAcc) });
    }

    // Busiest first: the question this report opens with is who has been on.
    out.sort((a, b) => b.totals.net - a.totals.net);
    return out;
  }, [rows]);

  const grand = useMemo(() => {
    const acc = emptyFils();
    for (const row of rows) addShift(acc, row);
    return toTotals(acc);
  }, [rows]);

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Every shift in the range, one per line — the whole thing, not what is expanded. */
  function exportCsv() {
    const head = [
      "Employee", "Business date", "Shift", "Opened", "Closed", "Closed by",
      "Orders", "Net sales", "Cash", "Card", "Online", "Expenses",
      "Opening float", "Expected cash", "Counted cash", "Difference", "Photo", "Note",
    ];
    const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body: string[][] = [];

    for (const staff of groups) {
      for (const day of staff.days) {
        for (const s of day.shifts) {
          body.push([
            quote(staff.name),
            s.businessDate,
            quote(s.label),
            clock(s.openedAt),
            clock(s.closedAt),
            quote(s.closedBy || staff.name),
            String(s.orderCount),
            s.netSales.toFixed(2),
            s.cashSales.toFixed(2),
            s.cardSales.toFixed(2),
            s.onlineSales.toFixed(2),
            s.expenseTotal.toFixed(2),
            s.openingFloat.toFixed(2),
            s.expectedCash.toFixed(2),
            s.countedCash.toFixed(2),
            s.difference.toFixed(2),
            s.photo ? "yes" : "no",
            quote(s.note),
          ]);
        }
      }
    }

    const csv = [head.join(","), ...body.map((r) => r.join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `shift-closes-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pos-scroll h-full space-y-4 p-4">
      {/* ─── What is being asked ─── */}
      <section className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${POS.line}` }}>
        <h2 className="text-base font-black" style={{ color: POS.ink }}>
          Shift Closes by Employee
        </h2>
        <p className="mt-0.5 text-[12.5px]" style={{ color: POS.inkSoft }}>
          Every close each person signed, added up per trading day. Figures are the
          ones frozen at each close, so they never move afterwards.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Period">
            <select
              value={period}
              onChange={(e) => {
                const next = e.target.value as typeof period;
                setPeriod(next);
                if (next === "7") preset(addBusinessDays(today, -6), today);
                else if (next === "30") preset(addBusinessDays(today, -29), today);
                else if (next === "month") preset(`${today.slice(0, 8)}01`, today);
              }}
              className={SELECT}
              style={{ ...CONTROL, minWidth: 190 }}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="month">This month</option>
              <option value="custom">Custom range…</option>
            </select>
          </Field>

          {period === "custom" && (
            <>
              <Field label="From">
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => { setFrom(e.target.value); setDirty(true); }}
                  className={SELECT}
                  style={CONTROL}
                />
              </Field>
              <Field label="To">
                <input
                  type="date"
                  value={to}
                  min={from}
                  max={today}
                  onChange={(e) => { setTo(e.target.value); setDirty(true); }}
                  className={SELECT}
                  style={CONTROL}
                />
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
            disabled={rows.length === 0}
            className="flex items-center gap-2 rounded-xl border px-4 text-[14px] font-bold disabled:opacity-40"
            style={{ height: 48, borderColor: POS.brand, color: POS.brand }}
          >
            <Download size={15} />
            Export
          </button>
        </div>
      </section>

      {loading && rows.length === 0 ? (
        <p className="py-16 text-center text-sm" style={{ color: POS.inkSoft }}>Working it out…</p>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-sm" style={{ color: POS.inkSoft }}>
          No shift was closed between {businessDateLabel(from)} and {businessDateLabel(to)}.
        </p>
      ) : (
        <>
          {/* ─── The whole range at a glance ─── */}
          <section
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Tile label="Shifts closed" value={String(grand.shifts)} />
            <Tile label="Orders" value={String(grand.orders)} />
            <Tile label="Net sales" value={aed(grand.net)} />
            <Tile
              label="Drawer difference"
              value={grand.difference === 0 ? "Balanced" : aed(grand.difference)}
              tone={grand.difference === 0 ? POS.good : POS.bad}
            />
          </section>

          {groups.map((staff) => (
            <section
              key={staff.key}
              className="overflow-hidden rounded-2xl bg-white"
              style={{ border: `1px solid ${POS.line}` }}
            >
              {/* Who, and how their whole range came out */}
              <div
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3"
                style={{ background: POS.page, borderBottom: `1px solid ${POS.line}` }}
              >
                <span className="flex items-center gap-2 text-[15px] font-black" style={{ color: POS.ink }}>
                  <UserRound size={16} style={{ color: POS.inkSoft }} />
                  {staff.name}
                </span>
                <span className="text-[12.5px]" style={{ color: POS.inkSoft }}>
                  {staff.totals.shifts} shift{staff.totals.shifts === 1 ? "" : "s"} ·{" "}
                  {staff.days.length} day{staff.days.length === 1 ? "" : "s"} ·{" "}
                  {staff.totals.orders} orders
                </span>
                <span className="flex items-baseline gap-3">
                  <span className="text-[15px] font-black" style={{ color: POS.ink }}>
                    {aed(staff.totals.net)}
                  </span>
                  <span
                    className="text-[13px] font-bold"
                    style={{ color: staff.totals.difference === 0 ? POS.good : POS.bad }}
                  >
                    {staff.totals.difference === 0 ? "Balanced" : aed(staff.totals.difference)}
                  </span>
                </span>
              </div>

              {/* Wide on purpose, so it scrolls inside the card rather than
                  stretching the page on a counter tablet. */}
              <div className="overflow-x-auto">
                <div style={{ minWidth: 880 }}>
                  <HeadRow />

                  {staff.days.map((day) => {
                    const id = `${staff.key}:${day.date}`;
                    const expanded = open.has(id);
                    /* One shift is already its own row — there is nothing
                       underneath to open, and a chevron that reveals a copy of
                       the line above it is a control that lies. */
                    const expandable = day.shifts.length > 1;

                    return (
                      <div key={id}>
                        <button
                          onClick={() => expandable && toggle(id)}
                          className="grid w-full items-center gap-2 px-4 py-2.5 text-start"
                          style={{
                            gridTemplateColumns: COLUMNS,
                            borderBottom: `1px solid ${POS.line}`,
                            cursor: expandable ? "pointer" : "default",
                          }}
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            {expandable ? (
                              expanded ? (
                                <ChevronDown size={14} style={{ color: POS.action }} />
                              ) : (
                                <ChevronRight size={14} style={{ color: POS.inkSoft }} />
                              )
                            ) : (
                              <span style={{ width: 14 }} />
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-bold" style={{ color: POS.ink }}>
                                {businessDateLabel(day.date)}
                              </span>
                              <span
                                className="block text-[11px] font-bold"
                                style={{ color: day.totals.shifts > 1 ? POS.action : POS.inkSoft }}
                              >
                                {day.totals.shifts > 1
                                  ? `${day.totals.shifts} shifts combined`
                                  : day.shifts[0]?.label || "1 shift"}
                              </span>
                            </span>
                          </span>
                          <Num v={String(day.totals.orders)} />
                          <Num v={aed(day.totals.net)} strong />
                          <Num v={aed(day.totals.cash)} muted />
                          <Num v={aed(day.totals.card)} muted />
                          <Num v={aed(day.totals.online)} muted />
                          <Num v={aed(day.totals.expected)} muted />
                          <Num v={aed(day.totals.counted)} muted />
                          <Diff v={day.totals.difference} />
                        </button>

                        {expanded &&
                          day.shifts.map((s) => (
                            <div
                              key={s.id}
                              className="grid items-center gap-2 py-2 ps-4 pe-4"
                              style={{
                                gridTemplateColumns: COLUMNS,
                                borderBottom: `1px solid ${POS.line}`,
                                background: POS.page,
                              }}
                            >
                              <span className="flex min-w-0 items-center gap-1.5 ps-[22px]">
                                <button
                                  onClick={() => s.photo && setZoom(s)}
                                  disabled={!s.photo}
                                  title={s.photo ? "Close photo" : "No photo was taken at this close"}
                                  className="shrink-0"
                                >
                                  {s.photo ? (
                                    <Camera size={13} style={{ color: POS.action }} />
                                  ) : (
                                    <CameraOff size={13} style={{ color: POS.inkSoft }} />
                                  )}
                                </button>
                                <span className="min-w-0">
                                  <span className="block truncate text-[12.5px]" style={{ color: POS.ink }}>
                                    {clock(s.openedAt)}–{clock(s.closedAt)}
                                  </span>
                                  <span className="block truncate text-[11px]" style={{ color: POS.inkSoft }}>
                                    {s.label}
                                    {s.closedBy && s.closedBy !== staff.name ? ` · closed by ${s.closedBy}` : ""}
                                  </span>
                                </span>
                              </span>
                              <Num v={String(s.orderCount)} />
                              <Num v={aed(s.netSales)} />
                              <Num v={aed(s.cashSales)} muted />
                              <Num v={aed(s.cardSales)} muted />
                              <Num v={aed(s.onlineSales)} muted />
                              <Num v={aed(s.expectedCash)} muted />
                              <Num v={aed(s.countedCash)} muted />
                              <Diff v={s.difference} />
                            </div>
                          ))}
                      </div>
                    );
                  })}

                  {/* The person's own bottom line, in the same columns */}
                  <div
                    className="grid items-center gap-2 px-4 py-2.5"
                    style={{ gridTemplateColumns: COLUMNS, background: "#fff" }}
                  >
                    <span className="ps-[22px] text-[12.5px] font-black" style={{ color: POS.ink }}>
                      Total
                    </span>
                    <Num v={String(staff.totals.orders)} strong />
                    <Num v={aed(staff.totals.net)} strong />
                    <Num v={aed(staff.totals.cash)} />
                    <Num v={aed(staff.totals.card)} />
                    <Num v={aed(staff.totals.online)} />
                    <Num v={aed(staff.totals.expected)} />
                    <Num v={aed(staff.totals.counted)} />
                    <Diff v={staff.totals.difference} />
                  </div>
                </div>
              </div>
            </section>
          ))}
        </>
      )}

      {/* Full size, because a thumbnail of a face is not evidence of anything. */}
      {zoom && (
        <button
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ background: "rgba(0,0,0,0.75)" }}
        >
          <span className="flex max-h-full flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom.photo} alt="" className="max-h-[75vh] rounded-xl object-contain" />
            <span className="text-[13px] font-semibold text-white">
              {zoom.closedBy || zoom.openedBy} · {businessDateLabel(zoom.businessDate)} ·{" "}
              {zoom.label} · closed {clock(zoom.closedAt)}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

/* Day · orders · net · cash · card · online · expected · counted · difference */
const COLUMNS = "1.7fr 70px 110px 100px 100px 100px 110px 110px 110px";

function HeadRow() {
  const cells = ["Day", "Orders", "Net sales", "Cash", "Card", "Online", "Expected", "Counted", "Difference"];
  return (
    <div
      className="grid gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wide"
      style={{ gridTemplateColumns: COLUMNS, color: POS.inkSoft, borderBottom: `1px solid ${POS.line}` }}
    >
      {cells.map((c, i) => (
        <span key={c} className={i === 0 ? "" : "text-end"}>{c}</span>
      ))}
    </div>
  );
}

function Num({ v, strong, muted }: { v: string; strong?: boolean; muted?: boolean }) {
  return (
    <span
      className={`text-end text-[12.5px] ${strong ? "font-black" : "font-semibold"}`}
      style={{ color: muted ? POS.inkSoft : POS.ink }}
    >
      {v}
    </span>
  );
}

function Diff({ v }: { v: number }) {
  return (
    <span
      className="text-end text-[12.5px] font-bold"
      style={{ color: v === 0 ? POS.good : POS.bad }}
    >
      {v === 0 ? "Balanced" : `${v > 0 ? "+" : "−"}${aed(Math.abs(v))}`}
    </span>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${POS.line}` }}>
      <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide" style={{ color: POS.inkSoft }}>
        <CalendarDays size={12} />
        {label}
      </p>
      <p className="mt-1 text-[22px] font-black" style={{ color: tone ?? POS.ink }}>{value}</p>
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
