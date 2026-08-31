"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, ClipboardList, LogOut, Minus, Plus, RotateCw, Sun, Wallet } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { DENOMINATIONS } from "@/lib/pos/shift";
import { ROLE_LABEL, type PosStaff } from "@/lib/pos/constants";

/**
 * Start Your Shift.
 *
 * The float is counted note by note rather than typed as a total, because the
 * count is the point: a drawer that comes to the right number with the wrong
 * notes in it is a drawer somebody has been into, and only the breakdown shows
 * that. The total is derived here and derived again on the server — what is
 * sent is the count, never the sum.
 */

/**
 * What the drawer is meant to open with.
 *
 * Zero unless a branch sets one in admin → POS → Settings. A figure invented
 * here would show every count as "short" until it happened to match, and a
 * screen that cries short on a correct drawer teaches people to ignore it.
 */
const EXPECTED_FLOAT = 0;

export default function OpeningCash({
  staff,
  expectedFloat = EXPECTED_FLOAT,
  branchName,
}: {
  staff: PosStaff;
  expectedFloat?: number;
  branchName: string;
}) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const total = useMemo(
    () => DENOMINATIONS.reduce((sum, d) => sum + d * (counts[d] ?? 0), 0),
    [counts],
  );
  const difference = Math.round((total - expectedFloat) * 100) / 100;

  function bump(note: number, by: number) {
    setCounts((c) => ({ ...c, [note]: Math.max(0, (c[note] ?? 0) + by) }));
  }

  async function openShift() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/pos/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counts, note }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error || "Could not open the shift");
        return;
      }
      router.replace("/pos/till");
      router.refresh();
    } catch {
      setError("No connection to the server. Check the network.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/pos/logout", { method: "POST" }).catch(() => {});
    router.replace("/pos/login");
    router.refresh();
  }

  const now = new Date();

  return (
    <div className="w-full h-full flex flex-col" style={{ background: POS.page }}>
      {/* ─── Bar ─── */}
      <header
        className="pos-chrome shrink-0 flex items-center gap-4 px-5 text-white"
        style={{ background: POS.night, height: 64 }}
      >
        <p className="text-2xl font-black tracking-tight shrink-0">
          <span style={{ color: POS.brand }}>2</span>
          <span className="text-base align-middle">in</span>
          <span style={{ color: POS.brand }}>1</span>
        </p>
        <h1 className="text-xl font-bold">Opening Cash</h1>
        <div className="flex-1" />
        <span className="rounded-lg px-3 py-2 text-sm font-semibold" style={{ background: POS.nightSoft }}>
          {staff.name || staff.staff_id} · {ROLE_LABEL[staff.role]}
        </span>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold active:scale-95 transition-transform"
          style={{ background: POS.nightSoft }}
        >
          <LogOut size={15} />
          Logout
        </button>
      </header>

      <div className="pos-scroll flex-1 p-5">
        <h2 className="text-2xl font-black" style={{ color: POS.ink }}>
          Start Your Shift
        </h2>
        <p className="mt-1 text-sm" style={{ color: POS.inkSoft }}>
          Count and confirm the cash in your drawer before opening the POS.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr_300px]">
          {/* ─── Shift details ─── */}
          <Card title="Shift Details" icon={<CalendarDays size={16} />}>
            <Detail label="Restaurant / Branch" value={branchName} />
            <Detail label="Staff" value={`${staff.name || staff.staff_id} · ${ROLE_LABEL[staff.role]}`} />
            <Detail
              label="Date"
              value={now.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
            />
            <Detail
              label="Opening Time"
              value={now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            />
            <div className="pt-1">
              <p className="text-[11px] font-semibold" style={{ color: POS.inkSoft }}>Shift</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold" style={{ color: POS.warn }}>
                <Sun size={15} />
                {now.getHours() < 12 ? "Morning" : now.getHours() < 17 ? "Afternoon" : "Evening"} Shift
              </p>
            </div>
          </Card>

          {/* ─── The count ─── */}
          <Card title="Cash Denomination Count" icon={<Wallet size={16} />}>
            <div className="flex items-center justify-between pb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: POS.inkSoft }}>
              <span>Denomination</span>
              <span className="flex items-center gap-10">
                <span>Quantity</span>
                <span>Amount</span>
              </span>
            </div>
            {DENOMINATIONS.map((note) => {
              const n = counts[note] ?? 0;
              return (
                <div
                  key={note}
                  className="flex items-center justify-between py-1.5"
                  style={{ borderTop: `1px solid ${POS.line}` }}
                >
                  <span className="text-sm font-semibold" style={{ color: POS.ink }}>
                    AED {note.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-2">
                      <Step onClick={() => bump(note, -1)} disabled={n === 0} label={`One less AED ${note}`}>
                        <Minus size={14} />
                      </Step>
                      <span className="w-8 text-center text-sm font-bold" style={{ color: POS.ink }}>
                        {n}
                      </span>
                      <Step onClick={() => bump(note, 1)} label={`One more AED ${note}`}>
                        <Plus size={14} />
                      </Step>
                    </span>
                    <span className="w-24 text-end text-sm font-semibold" style={{ color: n ? POS.ink : "#B6BCC2" }}>
                      AED {(note * n).toFixed(2)}
                    </span>
                  </span>
                </div>
              );
            })}
            <div
              className="mt-1 flex items-center justify-between pt-2.5"
              style={{ borderTop: `2px solid ${POS.line}` }}
            >
              <span className="text-sm font-black" style={{ color: POS.ink }}>Total Counted</span>
              <span className="text-lg font-black" style={{ color: POS.ink }}>AED {total.toFixed(2)}</span>
            </div>
          </Card>

          {/* ─── Summary ─── */}
          <Card title="Opening Summary" icon={<ClipboardList size={16} />}>
            {expectedFloat > 0 && (
              <div>
                <p className="text-[11px] font-semibold" style={{ color: POS.inkSoft }}>Expected Float</p>
                <p className="text-sm font-bold" style={{ color: POS.ink }}>AED {expectedFloat.toFixed(2)}</p>
              </div>
            )}
            <div style={{ borderTop: `1px solid ${POS.line}` }} className="pt-3">
              <p className="text-[11px] font-semibold" style={{ color: POS.inkSoft }}>Counted Cash</p>
              <p className="text-3xl font-black" style={{ color: POS.ink }}>AED {total.toFixed(2)}</p>
            </div>
            {/* Nothing to be over or short against until a branch has said what
                the drawer should start with. */}
            {expectedFloat > 0 && (
            <div>
              <p className="text-[11px] font-semibold" style={{ color: POS.inkSoft }}>Difference</p>
              <div className="mt-0.5 flex items-center gap-2">
                <p
                  className="text-xl font-black"
                  style={{ color: difference === 0 ? POS.good : difference > 0 ? POS.warn : POS.bad }}
                >
                  {difference > 0 ? "+" : ""}AED {difference.toFixed(2)}
                </p>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={
                    difference === 0
                      ? { background: POS.goodSoft, color: POS.good }
                      : { background: POS.badSoft, color: difference > 0 ? POS.warn : POS.bad }
                  }
                >
                  {difference === 0 ? "Balanced" : difference > 0 ? "Over" : "Short"}
                </span>
              </div>
            </div>
            )}

            <div>
              <p className="mb-1 text-[11px] font-semibold" style={{ color: POS.inkSoft }}>Notes</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Optional opening note"
                className="w-full resize-none rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
              />
            </div>

            {/* A deliberate act, not a default. The figure above is what the
                whole day is reconciled against, so it is worth one tap. */}
            <button
              onClick={() => setConfirmed((v) => !v)}
              className="flex w-full items-start gap-2.5 text-start"
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded"
                style={{
                  border: `2px solid ${confirmed ? POS.action : "#C7CDD2"}`,
                  background: confirmed ? POS.action : "#fff",
                }}
              >
                {confirmed && (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="#fff" strokeWidth={4}>
                    <path d="M4 12l6 6L20 6" />
                  </svg>
                )}
              </span>
              <span className="text-[13px] font-semibold" style={{ color: POS.ink }}>
                I confirm the cash has been counted
              </span>
            </button>
          </Card>
        </div>

        {error && (
          <p
            className="mt-4 rounded-lg px-4 py-2.5 text-sm font-semibold"
            style={{ background: POS.badSoft, color: POS.bad }}
          >
            {error}
          </p>
        )}
      </div>

      {/* ─── Out ─── */}
      <div
        className="pos-chrome shrink-0 flex items-center gap-3 px-5 py-3.5 bg-white"
        style={{ borderTop: `1px solid ${POS.line}` }}
      >
        <button
          onClick={signOut}
          className="flex items-center gap-2 rounded-xl px-5 text-sm font-bold active:scale-95 transition-transform"
          style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 50 }}
        >
          <LogOut size={16} />
          Back to Login
        </button>
        <button
          onClick={() => { setCounts({}); setConfirmed(false); }}
          className="flex items-center gap-2 rounded-xl px-5 text-sm font-bold active:scale-95 transition-transform"
          style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 50 }}
        >
          <RotateCw size={16} />
          Recount
        </button>
        <div className="flex-1" />
        <button
          onClick={openShift}
          disabled={!confirmed || busy}
          className="flex items-center gap-2.5 rounded-xl px-7 text-base font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-40"
          style={{ background: POS.action, height: 50 }}
        >
          {busy ? "OPENING…" : "OPEN SHIFT & GO TO POS"}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

/* ─── Small pieces ─────────────────────────────────────────────────────────── */

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${POS.line}` }}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold" style={{ color: POS.ink }}>
        <span style={{ color: POS.inkSoft }}>{icon}</span>
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold" style={{ color: POS.inkSoft }}>{label}</p>
      <p className="mt-0.5 text-sm font-bold" style={{ color: POS.ink }}>{value}</p>
    </div>
  );
}

function Step({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg active:scale-90 transition-transform disabled:opacity-30"
      style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
    >
      {children}
    </button>
  );
}
