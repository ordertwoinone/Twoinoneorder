"use client";

import { useState } from "react";
import { POS } from "@/lib/pos/theme";
import { aed, type PosDiscount } from "@/lib/pos/cart";

/**
 * Knocking money off.
 *
 * The ceiling shown here is the cashier's, and the server enforces the same one
 * against the signed-in role — this dialog stops an honest mistake, it is not
 * the control. A manager signing in raises it, which is the point of the role.
 */
export default function DiscountDialog({
  current,
  itemsTotal,
  maxPercent,
  isManager,
  onClose,
  onApply,
}: {
  current: PosDiscount | null;
  itemsTotal: number;
  maxPercent: number;
  isManager: boolean;
  onClose: () => void;
  onApply: (discount: PosDiscount | null) => void;
}) {
  const [mode, setMode] = useState<"percent" | "amount">(current?.mode ?? "percent");
  const [value, setValue] = useState(String(current?.value ?? ""));
  const [reason, setReason] = useState(current?.reason ?? "");

  const n = Math.max(0, Number(value) || 0);
  const asPercent = mode === "percent" ? n : itemsTotal > 0 ? (n / itemsTotal) * 100 : 0;
  const over = asPercent > maxPercent;
  const off = mode === "percent" ? Math.round(((itemsTotal * n) / 100) * 100) / 100 : Math.min(n, itemsTotal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-[400px] rounded-2xl bg-white p-6">
        <h2 className="text-lg font-black" style={{ color: POS.ink }}>Discount</h2>
        <p className="mt-0.5 text-[12.5px]" style={{ color: POS.inkSoft }}>
          Comes off the food only — the delivery charge is not discounted.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {(["percent", "amount"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="rounded-xl py-2.5 text-[13px] font-bold"
              style={{
                background: mode === m ? POS.action : "#fff",
                color: mode === m ? "#fff" : POS.inkSoft,
                border: `1px solid ${mode === m ? POS.action : POS.line}`,
              }}
            >
              {m === "percent" ? "Percentage" : "Fixed amount"}
            </button>
          ))}
        </div>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder={mode === "percent" ? "10" : "5.00"}
          className="mt-3 w-full rounded-xl px-4 text-2xl font-black focus:outline-none"
          style={{ border: `2px solid ${over ? POS.bad : POS.line}`, color: POS.ink, height: 60 }}
        />

        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="mt-2 w-full rounded-lg px-3 py-2.5 text-[13px] focus:outline-none"
          style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
        />

        <div
          className="mt-3 rounded-xl px-4 py-3 flex items-baseline justify-between"
          style={{ background: over ? POS.badSoft : POS.page }}
        >
          <span className="text-[13px] font-semibold" style={{ color: over ? POS.bad : POS.inkSoft }}>
            {over ? `Over the ${maxPercent}% limit` : "Comes off"}
          </span>
          <span className="text-lg font-black" style={{ color: over ? POS.bad : POS.ink }}>
            {aed(off)}
          </span>
        </div>

        {over && !isManager && (
          <p className="mt-2 text-[12px] font-semibold" style={{ color: POS.bad }}>
            A manager has to sign in to go past {maxPercent}%.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onApply(null)}
            className="rounded-xl px-4 text-[13px] font-bold"
            style={{ background: POS.page, color: POS.ink, height: 46 }}
          >
            Remove
          </button>
          <button
            onClick={onClose}
            className="rounded-xl px-4 text-[13px] font-bold"
            style={{ background: POS.page, color: POS.ink, height: 46 }}
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(n > 0 ? { mode, value: n, reason } : null)}
            disabled={over}
            className="flex-1 rounded-xl text-[14px] font-bold text-white disabled:opacity-40"
            style={{ background: POS.action, height: 46 }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
