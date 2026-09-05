"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Check,
  Clock,
  Lock,
  Minus,
  Plus,
  Printer,
  Undo2,
  UserRound,
  Utensils,
  Wallet,
  XCircle,
} from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed } from "@/lib/pos/cart";
import { DENOMINATIONS } from "@/lib/pos/shift";
import type { PosStaff } from "@/lib/pos/constants";
import { can } from "@/lib/pos/permissions";
import type { ShiftTakings } from "@/lib/pos/reconcile";
import type { PosShift } from "@/lib/pos/shift";
import PosShell from "@/components/pos/PosShell";
import StaleShiftWarning from "@/components/pos/StaleShiftWarning";
import type { StaleShift } from "@/lib/pos/shift";
import CloseCamera from "@/components/pos/CloseCamera";

/**
 * Shift Close — one cashier, one drawer.
 *
 * Not the day. This screen ends the shift of whoever is signed into it: count
 * the drawer, account for the difference, hand over. The restaurant carries on
 * trading under the next shift, and the day's combined figures are signed off
 * separately at /pos/day-close, by a manager, once every shift is in.
 *
 * The two were one screen and it served neither. A cashier finishing at four
 * could not hand the drawer over without signing off the whole restaurant's
 * day; and the manager who closed at midnight closed only their own shift, so
 * the morning's takings never appeared in anything anyone called a daily total.
 *
 * Two columns of the same money: what the orders say was taken, and what is
 * actually in the drawer. The difference between them is the only number
 * anybody argues about, so it is the one set in colour.
 *
 * The takings are read back from the orders every time this screen loads, not
 * from a counter kept during the shift — a running total that has drifted is
 * indistinguishable from a drawer that is short.
 */
export default function ShiftCloseScreen({
  staff,
  shift: initialShift,
  stale = [],
}: {
  staff: PosStaff;
  shift: PosShift;
  stale?: StaleShift[];
}) {
  const router = useRouter();
  const [shift] = useState(initialShift);
  const [takings, setTakings] = useState<ShiftTakings | null>(null);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [note, setNote] = useState("");
  /* Ticked to say the drawer really is empty, as opposed to not counted yet.
     The two look identical from here — both are zero — and only the person
     standing at the till can tell them apart. */
  const [emptyDrawer, setEmptyDrawer] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ summary: string; whatsappUrl: string; difference: number } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/pos/close", { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (body?.takings) setTakings(body.takings as ShiftTakings);
  }, []);

  useEffect(() => { load(); }, [load]);

  const counted = useMemo(
    () => DENOMINATIONS.reduce((sum, d) => sum + d * (counts[d] ?? 0), 0),
    [counts],
  );
  /* An untouched drawer is not a short one. Before a single note has been
     counted the difference is the whole float, and shouting "SHORT AED 500" at
     someone who has not started counting is how a screen loses their trust.

     But a drawer really can be empty — a quiet morning with no float and no
     sales — and treating zero as "not started" left that shift with no way to
     close at all. So the tick below is how somebody says which zero this is. */
  const startedCounting = Object.values(counts).some((n) => n > 0) || emptyDrawer;
  const expected = takings?.expectedCash ?? 0;
  const difference = Math.round((counted - expected) * 100) / 100;

  async function close() {
    setBusy(true);
    setError("");

    /* The photo goes up first and on its own. If it fails the close still
       happens — a reconciliation counted by hand must not be lost to a flaky
       upload, and a shift with no picture is a question, not a disaster. */
    let photoUrl = "";
    if (photo) {
      try {
        const form = new FormData();
        form.append("photo", photo, "close.jpg");
        const up = await fetch("/api/pos/close-photo", { method: "POST", body: form });
        const body = await up.json().catch(() => null);
        if (up.ok && body?.url) photoUrl = body.url;
      } catch {
        /* carry on without it */
      }
    }

    const res = await fetch("/api/pos/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counts, note, photoUrl }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(body?.error || "Could not close the shift.");
      return;
    }
    setDone({ summary: body.summary, whatsappUrl: body.whatsappUrl, difference: body.difference });
  }

  /* Closing your own drawer is a cashier's job, not a manager's — that was the
     rule that made the old combined screen unusable at a handover. What still
     needs a manager is the day, on its own screen. */
  const canClose = can(staff, "shift_close");

  if (done) {
    return (
      <PosShell staff={staff} title="Shift Close" subtitle="Shift closed">
        <div className="pos-scroll h-full flex items-center justify-center p-6">
          <div className="w-full max-w-[540px] rounded-2xl bg-white p-7 text-center" style={{ border: `1px solid ${POS.line}` }}>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: POS.goodSoft }}>
              <Check size={28} strokeWidth={3} style={{ color: POS.good }} />
            </span>
            <h2 className="mt-3 text-2xl font-black" style={{ color: POS.ink }}>Shift closed</h2>
            <p className="mt-1 text-sm" style={{ color: POS.inkSoft }}>
              {done.difference === 0
                ? "The drawer balanced."
                : `The drawer was ${done.difference > 0 ? "over" : "short"} by ${aed(Math.abs(done.difference))}.`}
            </p>
            {/* Said plainly, because the old screen said the opposite by
                implication and people went home believing the day was done. */}
            <p className="mt-1 text-[12.5px]" style={{ color: POS.inkSoft }}>
              This closes your shift only. The restaurant keeps trading, and a manager signs the
              business day off at the end of it.
            </p>

            <pre
              className="mt-4 whitespace-pre-wrap rounded-xl p-4 text-left text-[12.5px] leading-relaxed"
              style={{ background: POS.page, color: POS.ink }}
            >
              {done.summary}
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
                  onClick={() => navigator.clipboard?.writeText(done.summary)}
                  className="flex-1 rounded-xl text-sm font-bold"
                  style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 48 }}
                >
                  Copy summary
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

  return (
    <PosShell
      staff={staff}
      title="Shift Close"
      subtitle={`${shift.shift_label} shift · ${staff.name || staff.staff_id} · opened ${new Date(shift.opened_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
      warning={<StaleShiftWarning shifts={stale} />}
    >
      <div className="pos-scroll h-full p-4">
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr_320px]">
          {/* ─── What was sold ─── */}
          <Card title="Sales summary" icon={<BarChart3 size={16} />}>
            {!takings ? (
              <p className="text-[13px]" style={{ color: POS.inkSoft }}>Working it out…</p>
            ) : (
              <>
                <Row label="Gross sales" value={aed(takings.grossSales)} />
                <Row label="Discounts" value={`− ${aed(takings.discountTotal)}`} tone={POS.bad} />
                <Row
                  label="Refunded payments"
                  value={takings.refundTotal > 0 ? `− ${aed(takings.refundTotal)}` : aed(0)}
                  tone={takings.refundTotal > 0 ? POS.bad : undefined}
                />
                <Row
                  label="Cancelled order payments"
                  value={takings.cancelledTotal > 0 ? `− ${aed(takings.cancelledTotal)}` : aed(0)}
                  tone={takings.cancelledTotal > 0 ? POS.bad : undefined}
                />
                {takings.staffFoodTotal > 0 && (
                  <Row
                    label="Staff Food (not paid)"
                    value={`− ${aed(takings.staffFoodTotal)}`}
                    tone={POS.brand}
                  />
                )}
                <Row label="VAT (included)" value={aed(takings.vatTotal)} muted />
                <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${POS.line}` }}>
                  <p className="text-[11.5px]" style={{ color: POS.inkSoft }}>Net sales</p>
                  <p className="text-3xl font-black" style={{ color: POS.ink }}>{aed(takings.netSales)}</p>
                  <p className="mt-1 text-[12px]" style={{ color: POS.inkSoft }}>
                    {takings.orderCount} order{takings.orderCount === 1 ? "" : "s"} · average{" "}
                    {aed(takings.averageOrder)}
                  </p>
                </div>

                <div className="mt-3 pt-3 space-y-1" style={{ borderTop: `1px solid ${POS.line}` }}>
                  <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wide" style={{ color: POS.inkSoft }}>
                    Collected payments
                  </p>
                  <Row label="Cash" value={aed(takings.cashSales)} />
                  <Row label="Card" value={aed(takings.cardSales)} />
                  <Row label="Online" value={aed(takings.onlineSales)} />
                  {takings.expenseTotal > 0 && (
                    <Row label="Expenses paid out" value={`− ${aed(takings.expenseTotal)}`} tone={POS.bad} />
                  )}
                </div>

                {/* Food that went out with no money arriving. Kept apart from
                    the takings above rather than netted against them: each of
                    these is a different question — a staff meal is a cost, a
                    credit is a debt, a pending is a sale that has not happened
                    yet — and a manager needs to see all three named. */}
                <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: `1px solid ${POS.line}` }}>
                  <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wide" style={{ color: POS.inkSoft }}>
                    Not collected / non-revenue
                  </p>
                  <Tally
                    icon={<Utensils size={14} />}
                    label="Staff Food"
                    count={takings.staffFoodCount}
                    value={aed(takings.staffFoodTotal)}
                    note="Excluded from net sales and drawer cash."
                  />
                  <Tally
                    icon={<UserRound size={14} />}
                    label="Credit"
                    count={takings.creditCount}
                    value={aed(takings.creditTotal)}
                  />
                  <Tally
                    icon={<Clock size={14} />}
                    label="Pending"
                    count={takings.pendingCount}
                    value={aed(takings.pendingTotal)}
                  />
                </div>

                <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: `1px solid ${POS.line}` }}>
                  <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wide" style={{ color: POS.inkSoft }}>
                    Payment adjustments
                  </p>
                  <Tally
                    icon={<Undo2 size={14} />}
                    label="Refunded Payments"
                    count={takings.refundedCount}
                    value={aed(takings.refundTotal)}
                  />
                  <Tally
                    icon={<XCircle size={14} />}
                    label="Cancelled Order Payments"
                    count={takings.cancelledCount}
                    value={aed(takings.cancelledTotal)}
                    note="Excluded from net sales and drawer cash."
                  />
                </div>
              </>
            )}
          </Card>

          {/* ─── What is in the drawer ─── */}
          <Card title="Closing cash count" icon={<Wallet size={16} />}>
            {DENOMINATIONS.map((note) => {
              const n = counts[note] ?? 0;
              return (
                <div
                  key={note}
                  className="flex items-center justify-between py-1"
                  style={{ borderTop: `1px solid ${POS.line}` }}
                >
                  <span className="text-[13px] font-semibold" style={{ color: POS.ink }}>
                    AED {note.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-2">
                    <Step onClick={() => setCounts((c) => ({ ...c, [note]: Math.max(0, (c[note] ?? 0) - 1) }))} disabled={n === 0}>
                      <Minus size={13} />
                    </Step>
                    <span className="w-7 text-center text-[13px] font-bold" style={{ color: POS.ink }}>{n}</span>
                    <Step onClick={() => setCounts((c) => ({ ...c, [note]: (c[note] ?? 0) + 1 }))}>
                      <Plus size={13} />
                    </Step>
                    <span className="w-24 text-end text-[13px] font-semibold" style={{ color: n ? POS.ink : "#B6BCC2" }}>
                      {aed(note * n)}
                    </span>
                  </span>
                </div>
              );
            })}
            <div className="mt-1 flex items-center justify-between pt-2" style={{ borderTop: `2px solid ${POS.line}` }}>
              <span className="text-[13px] font-black" style={{ color: POS.ink }}>Total counted</span>
              <span className="text-lg font-black" style={{ color: POS.ink }}>{aed(counted)}</span>
            </div>
          </Card>

          {/* ─── Do they agree ─── */}
          <Card title="Cash reconciliation" icon={<Lock size={16} />}>
            <Row label="Opening float" value={aed(Number(shift.opening_float))} />
            <Row label="Cash sales" value={`+ ${aed(takings?.cashSales ?? 0)}`} tone={POS.good} />
            <Row label="Cash expenses" value={`− ${aed(takings?.cashExpenses ?? 0)}`} tone={POS.bad} />

            <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${POS.line}` }}>
              <Row label="Expected in drawer" value={aed(expected)} />
              <Row label="Actually counted" value={aed(counted)} />
            </div>

            <div
              className="mt-2 rounded-xl px-3 py-3 flex items-center justify-between"
              style={{
                background: !startedCounting ? POS.page : difference === 0 ? POS.goodSoft : POS.badSoft,
              }}
            >
              <span
                className="text-[13px] font-bold"
                style={{ color: !startedCounting ? POS.inkSoft : difference === 0 ? POS.good : POS.bad }}
              >
                {!startedCounting
                  ? "Count the drawer"
                  : difference === 0
                    ? "Balanced"
                    : difference > 0
                      ? "Over"
                      : "Short"}
              </span>
              {startedCounting && (
                <span className="text-xl font-black" style={{ color: difference === 0 ? POS.good : POS.bad }}>
                  {difference > 0 ? "+" : difference < 0 ? "−" : ""}
                  {aed(Math.abs(difference))}
                </span>
              )}
            </div>

            {/* Only when nothing has been counted, because that is the only
                time the question exists. Once a single note is in, the drawer
                has plainly been counted and asking again is noise. */}
            {counted === 0 && (
              <button
                onClick={() => setEmptyDrawer((v) => !v)}
                className="mt-2 flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-start"
                style={{
                  border: `1px solid ${emptyDrawer ? POS.action : POS.line}`,
                  background: emptyDrawer ? POS.goodSoft : "#fff",
                }}
              >
                <span
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded"
                  style={{
                    border: `2px solid ${emptyDrawer ? POS.action : "#C9CED3"}`,
                    background: emptyDrawer ? POS.action : "#fff",
                  }}
                >
                  {emptyDrawer && <Check size={10} strokeWidth={4} color="#fff" />}
                </span>
                <span>
                  <span className="block text-[12.5px] font-bold" style={{ color: POS.ink }}>
                    I have counted it — the drawer is empty
                  </span>
                  <span className="block text-[11.5px]" style={{ color: POS.inkSoft }}>
                    Tick this to close a shift that took nothing.
                  </span>
                </span>
              </button>
            )}

            <CloseCamera onCapture={setPhoto} />

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Closing note (optional)"
              className="mt-2 w-full resize-none rounded-lg px-3 py-2 text-[13px] focus:outline-none"
              style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
            />

            {!canClose && (
              <p
                className="rounded-lg px-3 py-2.5 text-[12px] font-semibold"
                style={{ background: POS.badSoft, color: POS.bad }}
              >
                You are not set up to close a shift. Count the drawer, then ask a manager or
                supervisor to sign it off.
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
              onClick={close}
              disabled={busy || !takings || !canClose || !startedCounting}
              className="w-full flex items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white disabled:opacity-40"
              style={{ background: POS.night, height: 52 }}
            >
              <Lock size={16} />
              {busy ? "Closing…" : "Close shift & hand over"}
            </button>
          </Card>
        </div>
      </div>
    </PosShell>
  );
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

/** A named non-sale: what it is, how many, what it came to, and why it is here. */
function Tally({
  icon,
  label,
  count,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="flex min-w-0 items-start gap-2">
        <span className="mt-0.5 shrink-0" style={{ color: POS.inkSoft }}>{icon}</span>
        <span className="min-w-0">
          <span className="block text-[12.5px] font-semibold" style={{ color: POS.ink }}>
            {label}
          </span>
          {note && count > 0 && (
            <span className="block text-[11px]" style={{ color: POS.brand }}>{note}</span>
          )}
        </span>
      </span>
      <span className="shrink-0 text-end">
        <span className="block text-[13px] font-semibold" style={{ color: POS.ink }}>{value}</span>
        <span className="block text-[11px]" style={{ color: POS.inkSoft }}>
          {count} order{count === 1 ? "" : "s"}
        </span>
      </span>
    </div>
  );
}

function Step({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-lg active:scale-90 transition-transform disabled:opacity-30"
      style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
    >
      {children}
    </button>
  );
}
