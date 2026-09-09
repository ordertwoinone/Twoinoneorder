"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Check,
  Clock,
  Lock,
  Minus,
  Plus,
  Printer,
  Undo2,
  UserRound,
  Users,
  Utensils,
  Wallet,
  XCircle,
} from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed } from "@/lib/pos/cart";
import { DENOMINATIONS, denominationLabel } from "@/lib/pos/shift";
import { businessDateLabel } from "@/lib/pos/business-day";
import type { PosStaff } from "@/lib/pos/constants";
import { can } from "@/lib/pos/permissions";
import type { ShiftTakings } from "@/lib/pos/reconcile";
import type { ClosableShift, PosShift } from "@/lib/pos/shift";
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
/** An order on this shift that nobody has taken the money for. */
interface PendingOrder {
  id: string;
  code: string;
  name: string;
  where: string;
  total: number;
  at: string;
}

/** One person's share of the day, as the contribution table lists it. */
interface Contribution {
  name: string;
  /** "Morning", "Morning ×2", "Morning, Evening" — every shift behind the row. */
  shift: string;
  /** How many shifts it adds up. More than one is worth saying out loud. */
  shiftCount: number;
  orders: number;
  net: number;
}

export default function ShiftCloseScreen({
  staff,
  shift: initialShift,
  closable: initialClosable = [],
  stale = [],
}: {
  staff: PosStaff;
  shift: PosShift;
  closable?: ClosableShift[];
  stale?: StaleShift[];
}) {
  const router = useRouter();
  const [shift, setShift] = useState(initialShift);
  /* Which drawer this screen is counting. Usually the caller's own; on a
     clean-up, one somebody else left open. */
  const [targetId, setTargetId] = useState(initialShift.id);
  const [closable, setClosable] = useState<ClosableShift[]>(initialClosable);
  /** Whose takings these are, which is not always who is signing them off. */
  const [owner, setOwner] = useState(staff.name || staff.staff_id);
  const [mine, setMine] = useState(true);
  /** The trading day we are in, per the branch's clock rather than the tablet's. */
  const [today, setToday] = useState("");
  const [takings, setTakings] = useState<ShiftTakings | null>(null);
  /** Who sold what across the whole trading day, not just this shift. */
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [businessDate, setBusinessDate] = useState("");
  const [pending, setPending] = useState<PendingOrder[]>([]);
  /* Kiosk tickets from today that joined no shift, because nobody ever charged
     for them. Shown beside the shift's own — a cashier at the counter can still
     collect on one whose customer is in the building. */
  const [pendingKiosk, setPendingKiosk] = useState<PendingOrder[]>([]);
  /* Shown once. Somebody who has read the list and decided to go ahead anyway
     — the customer never came back, it is going on tomorrow — must not be
     stopped by the same dialog every time they press the button. */
  const [warnPending, setWarnPending] = useState(false);
  const [pendingSeen, setPendingSeen] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [note, setNote] = useState("");
  /* Two declarations, and they are not the same statement.
     "No sales" says nothing was rung up at all. "No cash" says money was taken
     but none of it in notes — a shift where everything went on card. Each is
     offered only when the figures make it the actual question, so neither can
     be ticked to wave away a drawer that simply has not been counted. */
  const [zeroSales, setZeroSales] = useState(false);
  const [zeroCash, setZeroCash] = useState(false);
  /* The third declaration, and the only one about a drawer that is not there
     any more. See the API for why it records nil rather than assuming a match. */
  const [uncounted, setUncounted] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ summary: string; whatsappUrl: string; difference: number } | null>(null);

  const load = useCallback(async (forShift: string) => {
    const res = await fetch(`/api/pos/close?shift=${forShift}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (body?.shift) setShift(body.shift as PosShift);
    if (body?.takings) setTakings(body.takings as ShiftTakings);
    if (Array.isArray(body?.contributions)) setContributions(body.contributions as Contribution[]);
    if (Array.isArray(body?.closable)) setClosable(body.closable as ClosableShift[]);
    if (body?.owner) setOwner(body.owner as string);
    setMine(body?.mine !== false);
    if (body?.businessDate) setBusinessDate(body.businessDate as string);
    if (body?.today) setToday(body.today as string);
    if (Array.isArray(body?.pending)) setPending(body.pending as PendingOrder[]);
    if (Array.isArray(body?.pendingKiosk)) setPendingKiosk(body.pendingKiosk as PendingOrder[]);
  }, []);

  useEffect(() => { load(targetId); }, [load, targetId]);

  /**
   * Turning the screen to another drawer.
   *
   * Every figure on it is about the drawer it was entered for. A count of notes
   * belongs to one drawer and would be a fabrication against any other; so does
   * a closing note, a photograph of the till, and a declaration that nothing was
   * sold. So the drawer changes and all of it is put back to nothing — rather
   * than carrying one shift's count into another shift's sign-off, which is the
   * one mistake on this screen that writes a false figure and looks fine.
   */
  function openShift(id: string) {
    if (id === targetId) return;
    setError("");
    setCounts({});
    setNote("");
    setZeroSales(false);
    setZeroCash(false);
    setUncounted(false);
    setPhoto(null);
    setPendingSeen(false);
    setWarnPending(false);
    setTakings(null);
    setTargetId(id);
  }

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
  const countedSomething = Object.values(counts).some((n) => n > 0);

  /* Each declaration is only available when the figures make it true. The
     screen cannot tell an empty drawer from an uncounted one, but it can tell
     whether there was anything to put in it — so it asks about the case that
     is actually in front of the person, and refuses the tick otherwise. */
  const canDeclareZeroSales = (takings?.netSales ?? 0) === 0;
  const canDeclareZeroCash = (takings?.cashSales ?? 0) === 0;
  /* A close where the money is not in front of the person doing it: somebody
     else's drawer, or one left open on an earlier trading day. Both mean the
     cash has almost certainly been emptied and the till put back into use. */
  const lateClose = !mine || Boolean(today && businessDate && businessDate !== today);

  const declared =
    (zeroSales && canDeclareZeroSales) ||
    (zeroCash && canDeclareZeroCash) ||
    (uncounted && lateClose);

  const startedCounting = countedSomething || declared;

  /** What the whole day has taken, for the share each person is shown against. */
  const dayNet = contributions.reduce((sum, r) => sum + r.net, 0);
  const expected = takings?.expectedCash ?? 0;
  const difference = Math.round((counted - expected) * 100) / 100;

  /** Everything nobody has collected, for the warning and its heading. */
  const owed = [...pending, ...pendingKiosk];
  const pendingTotal = owed.reduce((sum, o) => sum + o.total, 0);

  /**
   * The button. Asks first when there is money outstanding.
   *
   * Closing is the last moment anybody can do anything about an unpaid ticket:
   * afterwards the shift is shut, the figures are frozen, and the cashier who
   * knows which customer it was has gone home. So the tickets are put in front
   * of them by name and amount rather than left as a total on a panel further
   * up the screen, which is a number nobody can act on.
   */
  function attemptClose() {
    if (owed.length > 0 && !pendingSeen) {
      setWarnPending(true);
      return;
    }
    close();
  }

  async function close() {
    setWarnPending(false);
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
      body: JSON.stringify({
        // Named rather than assumed. The screen can be pointed at a drawer that
        // is not the caller's own, and the server must close the one on screen.
        shift: targetId,
        counts,
        note,
        photoUrl,
        uncounted: uncounted && lateClose,
        /* Sent so the shift row records which zero this was. A drawer signed
           off at nothing with nothing rung up is a quiet morning; the same
           drawer on a shift that took AED 800 on card is a different fact. */
        zeroSales: zeroSales && canDeclareZeroSales,
        zeroCash: zeroCash && canDeclareZeroCash,
      }),
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
  /* Somebody else's takings are a manager's signature. The guard already
     refuses to offer another cashier's drawer to anyone else, and the API
     refuses to close it — this is what greys the button out in between. */
  const canCloseThis = canClose && (mine || can(staff, "day_close"));

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
              {mine
                ? "This closes your shift only. The restaurant keeps trading, and a manager signs the business day off at the end of it."
                : `${owner}'s drawer is now reconciled and their shift is closed. Nothing about your own shift has changed.`}
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
                /* Closing your own drawer is the last thing you do before going
                   home, so it ends at the login screen. Clearing up after
                   somebody else is not — there may be another drawer behind
                   this one, and the guard on /pos/close hands back whichever
                   is next, or sends them to open their own if there is none. */
                onClick={() => {
                  if (!mine) { router.replace("/pos/close"); router.refresh(); return; }
                  router.replace("/pos/login");
                  router.refresh();
                }}
                className="flex-1 rounded-xl text-sm font-bold text-white"
                style={{ background: POS.action, height: 48 }}
              >
                {mine ? "Finish" : "Next drawer"}
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
      subtitle={`${businessDate ? `${businessDateLabel(businessDate)} · ` : ""}${shift.shift_label} shift · ${owner} · opened ${new Date(shift.opened_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
      actions={
        /* Says out loud what kind of drawer this is. A live one is still taking
           money, and a cashier counting a drawer that is still being sold out of
           will never balance. One left open on an earlier day is the opposite
           problem — it looks identical on screen, and the money is long gone. */
        lateClose ? (
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-black uppercase tracking-wide"
            style={{ background: "#FEF3C7", color: "#B45309" }}
          >
            <AlertTriangle size={12} />
            {mine ? "Your drawer · left open" : `${owner}'s drawer · left open`}
          </span>
        ) : (
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-black uppercase tracking-wide"
            style={{ background: POS.goodSoft, color: POS.good }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: POS.good }} />
            Current shift · running
          </span>
        )
      }
      warning={<StaleShiftWarning shifts={stale} />}
    >
      <div className="pos-scroll h-full p-4">
        {/*
          Which drawer is being closed.

          Hidden in the ordinary case, which is one cashier with one drawer
          handing over at four — putting a chooser in front of them would be
          asking a question that has only ever had one answer.

          Shown whenever this is not that: more than one drawer open, somebody
          else's, or one left open on an earlier day. That last one is why it is
          here at all, and it is the case where a lone chip still earns its
          place — a manager who has come to clear up a drawer from Monday wants
          to see the screen say Monday before they sign anything, and this is
          where they look for it.
        */}
        {(closable.length > 1 || !mine || lateClose) && (
          <div
            className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-white px-4 py-3"
            style={{ border: `1px solid ${POS.line}` }}
          >
            <span className="flex items-center gap-2 text-[13px] font-bold" style={{ color: POS.ink }}>
              <Users size={16} style={{ color: POS.inkSoft }} />
              Drawer being closed
            </span>
            {closable.map((s) => {
              const on = s.id === targetId;
              return (
                <button
                  key={s.id}
                  onClick={() => openShift(s.id)}
                  className="rounded-lg px-3 py-1.5 text-start text-[12.5px] font-bold"
                  style={{
                    background: on ? POS.night : "#fff",
                    color: on ? "#fff" : POS.ink,
                    border: `1px solid ${on ? POS.night : POS.line}`,
                  }}
                >
                  <span className="block">
                    {s.mine ? "Your" : `${s.staff_name}'s`} {s.shift_label.toLowerCase()}
                  </span>
                  <span
                    className="block text-[11px] font-semibold"
                    style={{ color: on ? "rgba(255,255,255,0.75)" : POS.inkSoft }}
                  >
                    {s.business_date ? businessDateLabel(s.business_date) : shortDay(s.opened_at)}
                    {s.days_old > 0 && ` · open ${s.days_old} day${s.days_old === 1 ? "" : "s"}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}

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
                {/* Deductions, because each is food that left the kitchen and
                    did not come back as money. Shown only when there is one:
                    a column of zeroes teaches people to stop reading it. */}
                {takings.staffFoodTotal > 0 && (
                  <Row
                    label="Staff Food (not paid)"
                    value={`− ${aed(takings.staffFoodTotal)}`}
                    tone={POS.brand}
                  />
                )}
                {takings.creditTotal > 0 && (
                  <Row label="On credit (not collected)" value={`− ${aed(takings.creditTotal)}`} tone={POS.brand} />
                )}
                {takings.pendingTotal > 0 && (
                  <Row label="Still to pay" value={`− ${aed(takings.pendingTotal)}`} tone={POS.brand} />
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
                    {denominationLabel(note)}
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

            {/* ─── Declaring a zero ─── */}
            {/* Offered only while the drawer reads zero, because that is the
                only moment either question exists. Once a single note is in,
                the drawer has plainly been counted. */}
            {counted === 0 && (
              <div className="mt-2 space-y-1.5">
                <Declaration
                  title="Zero-sales declaration"
                  detail="I confirm no sales were made during this shift."
                  unavailable="Available only when net sales are AED 0.00"
                  available={canDeclareZeroSales}
                  on={zeroSales}
                  onToggle={() => setZeroSales((v) => !v)}
                />
                <Declaration
                  title="Zero-cash declaration"
                  detail="I confirm no cash was received during this shift."
                  unavailable="Available only when cash sales are AED 0.00"
                  available={canDeclareZeroCash}
                  on={zeroCash}
                  onToggle={() => setZeroCash((v) => !v)}
                />
                {/* Only on a drawer nobody can count any more. Offering it on a
                    live shift would be offering a way to skip counting, which is
                    the entire job. */}
                <Declaration
                  title="Drawer never counted"
                  detail={`I confirm this drawer was already emptied and cannot be counted. ${aed(expected)} is recorded as unaccounted for.`}
                  unavailable="Available only on a shift left open from an earlier day"
                  available={lateClose}
                  on={uncounted}
                  onToggle={() => setUncounted((v) => !v)}
                />
              </div>
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
              onClick={attemptClose}
              disabled={busy || !takings || !canCloseThis || !startedCounting}
              className="w-full flex items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white disabled:opacity-40"
              style={{ background: POS.night, height: 52 }}
            >
              <Lock size={16} />
              {busy ? "Closing…" : mine ? "Close shift & hand over" : `Close ${owner}'s shift`}
            </button>
          </Card>
        </div>

        {/* ─── Who sold what today ─── */}
        {/* The whole trading day, not this shift: somebody who worked the
            morning and came back for the evening is one person here, which is
            what "employee contribution" means to whoever reads it. Counted from
            the orders rather than the shift rows, because this shift has not
            frozen its figures yet and reading those would show the person doing
            the closing as having sold nothing. */}
        {contributions.length > 0 && (
          <section
            className="mt-4 rounded-2xl bg-white p-4"
            style={{ border: `1px solid ${POS.line}` }}
          >
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold" style={{ color: POS.ink }}>
                <Users size={16} style={{ color: POS.inkSoft }} />
                Employee daily sales contribution
              </h2>
              <span className="text-[12px]" style={{ color: POS.inkSoft }}>
                {businessDate ? businessDateLabel(businessDate) : "Today"}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${POS.line}` }}>
              <div
                className="grid gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wide"
                style={{
                  gridTemplateColumns: "1.3fr 1fr 90px 130px 1.2fr",
                  color: POS.inkSoft,
                  borderBottom: `1px solid ${POS.line}`,
                }}
              >
                <span>Employee</span>
                <span>Shift</span>
                <span className="text-end">Orders</span>
                <span className="text-end">Net sales</span>
                <span>Contribution</span>
              </div>

              {contributions.map((row) => {
                const share = dayNet > 0 ? (row.net / dayNet) * 100 : 0;
                return (
                  <div
                    key={row.name}
                    className="grid items-center gap-2 px-3 py-2.5"
                    style={{
                      gridTemplateColumns: "1.3fr 1fr 90px 130px 1.2fr",
                      borderBottom: `1px solid ${POS.line}`,
                    }}
                  >
                    <span className="truncate text-[13px] font-bold" style={{ color: POS.ink }}>
                      {row.name}
                    </span>
                    {/* The row is one person's whole day. When that is more
                        than one shift it has to say so — the money was always
                        added up correctly, but a row reading "Morning" after
                        somebody had closed twice looked like the first close
                        had been dropped. */}
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px]" style={{ color: POS.inkSoft }}>
                        {row.shift || "—"}
                      </span>
                      {row.shiftCount > 1 && (
                        <span className="block text-[11px] font-bold" style={{ color: POS.action }}>
                          {row.shiftCount} shifts combined
                        </span>
                      )}
                    </span>
                    <span className="text-end text-[13px]" style={{ color: POS.ink }}>
                      {row.orders}
                    </span>
                    <span className="text-end text-[13px] font-semibold" style={{ color: POS.ink }}>
                      {aed(row.net)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className="text-[12.5px] font-bold tabular-nums"
                        style={{ color: POS.ink, width: 44 }}
                      >
                        {share.toFixed(0)}%
                      </span>
                      {/* The bar is the point of the column. Five numbers in a
                          list is arithmetic; five bars is an answer. */}
                      <span
                        className="h-2 flex-1 overflow-hidden rounded-full"
                        style={{ background: POS.page }}
                      >
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${Math.min(100, share)}%`, background: POS.action }}
                        />
                      </span>
                    </span>
                  </div>
                );
              })}

              <div
                className="grid items-center gap-2 px-3 py-2.5"
                style={{ gridTemplateColumns: "1.3fr 1fr 90px 130px 1.2fr", background: POS.page }}
              >
                <span className="text-[13px] font-black" style={{ color: POS.ink }}>Daily total</span>
                <span />
                <span className="text-end text-[13px] font-black" style={{ color: POS.ink }}>
                  {contributions.reduce((n, r) => n + r.orders, 0)}
                </span>
                <span className="text-end text-[13px] font-black" style={{ color: POS.ink }}>
                  {aed(dayNet)}
                </span>
                <span className="text-[12.5px] font-black" style={{ color: POS.ink }}>100%</span>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ─── Money still to collect ─── */}
      {warnPending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(15,23,42,0.55)" }}
        >
          <div
            className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-white"
            style={{ border: `1px solid ${POS.line}` }}
          >
            <div className="flex items-start gap-3 px-5 pt-5">
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: POS.badSoft }}
              >
                <AlertTriangle size={18} style={{ color: POS.bad }} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[17px] font-black" style={{ color: POS.ink }}>
                  {owed.length} order{owed.length === 1 ? "" : "s"} not paid for
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed" style={{ color: POS.inkSoft }}>
                  {aed(pendingTotal)} has not been collected. Take the payment on the Orders screen
                  and it lands on your drawer — close now and it stays outstanding, with nothing on
                  the shift to say whose it was.
                </p>
              </div>
            </div>

            <div className="mx-5 mt-4 overflow-hidden rounded-xl" style={{ border: `1px solid ${POS.line}` }}>
              <div className="max-h-[240px] overflow-y-auto">
                {pendingKiosk.length > 0 && pending.length > 0 && (
                  <p
                    className="px-3 py-1.5 text-[10.5px] font-black uppercase tracking-wide"
                    style={{ background: POS.page, color: POS.inkSoft }}
                  >
                    On your shift
                  </p>
                )}
                {pending.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                    style={{ borderBottom: `1px solid ${POS.line}` }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-bold" style={{ color: POS.ink }}>
                        {order.code}
                        {order.name ? ` · ${order.name}` : ""}
                      </span>
                      <span className="block truncate text-[11.5px]" style={{ color: POS.inkSoft }}>
                        {[order.where, order.at ? clockOf(order.at) : ""].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-black" style={{ color: POS.bad }}>
                      {aed(order.total)}
                    </span>
                  </div>
                ))}

                {pendingKiosk.length > 0 && (
                  <>
                    <p
                      className="px-3 py-1.5 text-[10.5px] font-black uppercase tracking-wide"
                      style={{ background: POS.page, color: POS.inkSoft }}
                    >
                      Kiosk · never collected on
                    </p>
                    {pendingKiosk.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                        style={{ borderBottom: `1px solid ${POS.line}` }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-bold" style={{ color: POS.ink }}>
                            {order.code}
                            {order.name ? ` · ${order.name}` : ""}
                          </span>
                          <span className="block truncate text-[11.5px]" style={{ color: POS.inkSoft }}>
                            {[order.where, order.at ? clockOf(order.at) : ""].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="shrink-0 text-[13px] font-black" style={{ color: POS.bad }}>
                          {aed(order.total)}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-5 py-4">
              <button
                onClick={() => router.push("/pos/orders")}
                className="flex-1 rounded-xl px-4 py-3 text-[13.5px] font-bold text-white"
                style={{ background: POS.action }}
              >
                Take the payments
              </button>
              <button
                onClick={() => { setPendingSeen(true); close(); }}
                className="rounded-xl px-4 py-3 text-[13.5px] font-bold"
                style={{ border: `1px solid ${POS.line}`, color: POS.inkSoft }}
              >
                Close anyway
              </button>
              <button
                onClick={() => setWarnPending(false)}
                className="rounded-xl px-4 py-3 text-[13.5px] font-bold"
                style={{ color: POS.inkSoft }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </PosShell>
  );
}

/** "14:22" — when the ticket was rung up, so it can be found on the board. */
function clockOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** "Mon 7 Sept", for a shift row written before business_date existed. */
function shortDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
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

/**
 * A statement somebody signs rather than a box they clear.
 *
 * Greyed with its reason showing when the figures do not support it, instead of
 * hidden — a cashier looking for "no sales" on a shift that took money needs to
 * see why it is not on offer, or they will go looking for it somewhere else.
 */
function Declaration({
  title,
  detail,
  unavailable,
  available,
  on,
  onToggle,
}: {
  title: string;
  detail: string;
  unavailable: string;
  available: boolean;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={!available}
      className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-start disabled:opacity-60"
      style={{
        border: `1px solid ${on && available ? POS.action : POS.line}`,
        background: on && available ? POS.goodSoft : "#fff",
      }}
    >
      <span
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded"
        style={{
          border: `2px solid ${on && available ? POS.action : "#C9CED3"}`,
          background: on && available ? POS.action : "#fff",
        }}
      >
        {on && available && <Check size={10} strokeWidth={4} color="#fff" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-bold" style={{ color: POS.ink }}>{title}</span>
        <span className="block text-[11.5px]" style={{ color: POS.inkSoft }}>{detail}</span>
        {!available && (
          <span className="mt-0.5 block text-[11px] font-semibold" style={{ color: POS.warn }}>
            {unavailable}
          </span>
        )}
      </span>
    </button>
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
