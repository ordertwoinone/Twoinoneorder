"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  Clock,
  CreditCard,
  Globe,
  UserRound,
  Utensils,
} from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed, PAYMENT_LABEL, type PosPayment } from "@/lib/pos/cart";

/**
 * Taking the money.
 *
 * Cash offers change, because working it out in your head with a queue waiting
 * is where the drawer goes wrong. Nothing about the change is sent to the
 * server — it is arithmetic for the cashier, not part of the order.
 *
 * Six ways to settle, and only the first three are payments in the ordinary
 * sense. Staff food, credit and pending are how a till records food that is
 * going out for something other than money changing hands now; see
 * lib/pos/cart.ts for what each does to the day's figures. They are on the
 * second row, greyed rather than green, so nobody reaches for one by muscle
 * memory while ringing up an ordinary sale.
 */

const METHODS: { key: PosPayment; icon: typeof Banknote }[] = [
  { key: "cash", icon: Banknote },
  { key: "card", icon: CreditCard },
  { key: "online", icon: Globe },
  { key: "staff_food", icon: Utensils },
  { key: "credit", icon: UserRound },
  { key: "pending", icon: Clock },
];

/** The notes a cashier is most often handed. */
const QUICK = [5, 10, 20, 50, 100, 200];

export default function PayDialog({
  total,
  busy,
  /** Dine-in only: the table has to be named before the order can be settled. */
  requireTable = false,
  tables = [],
  table = "",
  onTable,
  staffName = "",
  onStaffName,
  onCancel,
  onPay,
}: {
  total: number;
  busy: boolean;
  requireTable?: boolean;
  /** Table codes from the floor plan, e.g. "T1". Free text if the list is empty. */
  tables?: string[];
  table?: string;
  onTable?: (code: string) => void;
  /** Who the staff meal is for. Required once Staff Food is chosen. */
  staffName?: string;
  onStaffName?: (name: string) => void;
  onCancel: () => void;
  onPay: (method: PosPayment) => void;
}) {
  const [method, setMethod] = useState<PosPayment>("cash");
  const [tendered, setTendered] = useState<number | null>(null);

  const change = tendered !== null ? Math.round((tendered - total) * 100) / 100 : null;

  // Escape cancels, for the tills that have a keyboard on the counter.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  /* A dine-in order with no table is a plate nobody can carry anywhere. The
     button stays off rather than the order going through and being fixed
     later, because "later" is after the customer has walked away from the
     counter. */
  const needsTable = requireTable && !table.trim();

  /* A staff meal with nobody's name on it is food that left the kitchen and
     cannot be asked about. The figure on the close screen is only useful if
     somebody can answer "who?" — otherwise it is a number that grows and
     nobody owns, which is how a free lunch becomes six free lunches. */
  const needsName = method === "staff_food" && !staffName.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div className="w-full max-w-[430px] rounded-2xl bg-white p-6">
        <p className="text-center text-[13px] font-semibold" style={{ color: POS.inkSoft }}>
          Amount due
        </p>
        <p className="text-center text-4xl font-black" style={{ color: POS.ink }}>
          {aed(total)}
        </p>

        {/* ─── Which table ─── */}
        {requireTable && (
          <div className="mt-5">
            <label className="mb-1.5 block text-[12.5px] font-bold" style={{ color: POS.ink }}>
              Table Number <span style={{ color: POS.bad }}>*</span>
            </label>
            {tables.length > 0 ? (
              <select
                value={table}
                onChange={(e) => onTable?.(e.target.value)}
                className="w-full rounded-lg bg-white px-3 text-[15px] font-bold focus:outline-none"
                style={{
                  border: `1px solid ${needsTable ? POS.bad : POS.line}`,
                  color: POS.ink,
                  height: 48,
                }}
              >
                <option value="">Choose a table…</option>
                {tables.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            ) : (
              /* No floor plan set up yet. Typing it is better than a dropdown
                 with nothing in it and an order that cannot be completed. */
              <input
                value={table}
                onChange={(e) => onTable?.(e.target.value)}
                placeholder="Table number"
                className="w-full rounded-lg px-3 text-[15px] font-bold focus:outline-none"
                style={{
                  border: `1px solid ${needsTable ? POS.bad : POS.line}`,
                  color: POS.ink,
                  height: 48,
                }}
              />
            )}
          </div>
        )}

        {/* ─── How it is being settled ─── */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {METHODS.map(({ key, icon: Icon }) => {
            const active = method === key;
            // The three that are not money arriving now read quieter.
            const ordinary = key === "cash" || key === "card" || key === "online";
            return (
              <button
                key={key}
                onClick={() => { setMethod(key); setTendered(null); }}
                className="flex flex-col items-center gap-1.5 rounded-xl py-3 text-[13px] font-bold transition-colors"
                style={{
                  background: active ? (ordinary ? POS.action : POS.night) : "#fff",
                  color: active ? "#fff" : ordinary ? POS.ink : POS.inkSoft,
                  border: `1px solid ${active ? (ordinary ? POS.action : POS.night) : POS.line}`,
                }}
              >
                <Icon size={18} />
                {PAYMENT_LABEL[key]}
              </button>
            );
          })}
        </div>

        {/* ─── Who the staff meal is for ─── */}
        {method === "staff_food" && (
          <div className="mt-4">
            <label className="mb-1.5 block text-[12.5px] font-bold" style={{ color: POS.ink }}>
              Who is it for? <span style={{ color: POS.bad }}>*</span>
            </label>
            <input
              value={staffName}
              autoFocus
              onChange={(e) => onStaffName?.(e.target.value.slice(0, 60))}
              placeholder="Name of the staff member"
              className="w-full rounded-lg px-3 text-[15px] font-bold focus:outline-none"
              style={{
                border: `1px solid ${needsName ? POS.bad : POS.line}`,
                color: POS.ink,
                height: 48,
              }}
            />
            <p className="mt-1.5 text-[11.5px]" style={{ color: POS.inkSoft }}>
              It prints on the ticket and shows on the order board, so the meal can be accounted
              for.
            </p>
          </div>
        )}

        {/* ─── Change, for cash ─── */}
        {method === "cash" && (
          <div className="mt-4">
            <p className="mb-1.5 text-[12.5px] font-bold" style={{ color: POS.ink }}>
              Cash received
            </p>
            <div className="grid grid-cols-4 gap-2">
              {QUICK.map((note) => (
                <button
                  key={note}
                  onClick={() => setTendered(note)}
                  className="rounded-lg text-[14px] font-bold transition-colors"
                  style={{
                    height: 42,
                    background: tendered === note ? POS.night : POS.page,
                    color: tendered === note ? "#fff" : POS.ink,
                  }}
                >
                  {note}
                </button>
              ))}
              <button
                onClick={() => setTendered(total)}
                className="col-span-2 rounded-lg text-[14px] font-bold transition-colors"
                style={{
                  height: 42,
                  background: tendered === total ? POS.night : POS.page,
                  color: tendered === total ? "#fff" : POS.ink,
                }}
              >
                Exact
              </button>
            </div>

            {change !== null && (
              <div
                className="mt-2 flex items-baseline justify-between rounded-lg px-3 py-2.5"
                style={{ background: change < 0 ? POS.badSoft : POS.goodSoft }}
              >
                <span
                  className="text-[13px] font-bold"
                  style={{ color: change < 0 ? POS.bad : POS.good }}
                >
                  {change < 0 ? "Still owed" : "Change"}
                </span>
                <span
                  className="text-xl font-black"
                  style={{ color: change < 0 ? POS.bad : POS.good }}
                >
                  {aed(Math.abs(change))}
                </span>
              </div>
            )}
          </div>
        )}

        {needsTable && (
          <p className="mt-3 text-[12px] font-semibold" style={{ color: POS.bad }}>
            Pick the table this is going to.
          </p>
        )}
        {needsName && (
          <p className="mt-3 text-[12px] font-semibold" style={{ color: POS.bad }}>
            Say who the staff meal is for.
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl px-5 text-sm font-bold disabled:opacity-40"
            style={{ background: POS.page, color: POS.ink, height: 50 }}
          >
            Cancel
          </button>
          <button
            onClick={() => onPay(method)}
            disabled={busy || needsTable || needsName}
            className="flex-1 rounded-xl text-[15px] font-bold text-white disabled:opacity-40"
            style={{ background: POS.action, height: 50 }}
          >
            {busy ? "Sending…" : `Charge ${PAYMENT_LABEL[method]}`}
          </button>
        </div>
      </div>
    </div>
  );
}
