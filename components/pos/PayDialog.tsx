"use client";

import { useState } from "react";
import { Banknote, CreditCard, Globe } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed, PAYMENT_LABEL, type PosPayment } from "@/lib/pos/cart";

/**
 * Taking the money.
 *
 * Cash offers change, because working it out in your head with a queue waiting
 * is where the drawer goes wrong. Nothing here is sent to the server — the
 * change is arithmetic for the cashier, not part of the order.
 */

const METHODS: { key: PosPayment; icon: typeof Banknote }[] = [
  { key: "cash", icon: Banknote },
  { key: "card", icon: CreditCard },
  { key: "online", icon: Globe },
];

/** The notes a cashier is most often handed. */
const QUICK = [5, 10, 20, 50, 100, 200];

export default function PayDialog({
  total,
  busy,
  onCancel,
  onPay,
}: {
  total: number;
  busy: boolean;
  onCancel: () => void;
  onPay: (method: PosPayment) => void;
}) {
  const [method, setMethod] = useState<PosPayment>("cash");
  const [tendered, setTendered] = useState<number | null>(null);

  const change = tendered !== null ? Math.round((tendered - total) * 100) / 100 : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-[430px] rounded-2xl bg-white p-6">
        <p className="text-center text-[13px] font-semibold" style={{ color: POS.inkSoft }}>
          Amount due
        </p>
        <p className="text-center text-4xl font-black" style={{ color: POS.ink }}>
          {aed(total)}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {METHODS.map(({ key, icon: Icon }) => {
            const active = method === key;
            return (
              <button
                key={key}
                onClick={() => { setMethod(key); setTendered(null); }}
                className="flex flex-col items-center gap-1.5 rounded-xl py-3 text-[13px] font-bold transition-colors"
                style={{
                  background: active ? POS.action : "#fff",
                  color: active ? "#fff" : POS.inkSoft,
                  border: `1px solid ${active ? POS.action : POS.line}`,
                }}
              >
                <Icon size={19} />
                {PAYMENT_LABEL[key]}
              </button>
            );
          })}
        </div>

        {method === "cash" && (
          <div className="mt-4">
            <p className="mb-1.5 text-[12px] font-semibold" style={{ color: POS.inkSoft }}>
              Cash received
            </p>
            <div className="grid grid-cols-4 gap-2">
              {QUICK.map((n) => (
                <button
                  key={n}
                  onClick={() => setTendered(n)}
                  className="rounded-lg py-2.5 text-[13px] font-bold"
                  style={{
                    background: tendered === n ? POS.goodSoft : POS.page,
                    color: tendered === n ? POS.good : POS.ink,
                    border: `1px solid ${tendered === n ? POS.good : POS.line}`,
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setTendered(total)}
                className="col-span-2 rounded-lg py-2.5 text-[13px] font-bold"
                style={{
                  background: tendered === total ? POS.goodSoft : POS.page,
                  color: tendered === total ? POS.good : POS.ink,
                  border: `1px solid ${tendered === total ? POS.good : POS.line}`,
                }}
              >
                Exact
              </button>
            </div>

            {change !== null && (
              <div
                className="mt-3 rounded-xl px-4 py-3 flex items-baseline justify-between"
                style={{ background: change < 0 ? POS.badSoft : POS.goodSoft }}
              >
                <span className="text-[13px] font-bold" style={{ color: change < 0 ? POS.bad : POS.good }}>
                  {change < 0 ? "Still owing" : "Change"}
                </span>
                <span className="text-xl font-black" style={{ color: change < 0 ? POS.bad : POS.good }}>
                  {aed(Math.abs(change))}
                </span>
              </div>
            )}
          </div>
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
            disabled={busy}
            className="flex-1 rounded-xl text-base font-bold text-white disabled:opacity-40"
            style={{ background: POS.action, height: 50 }}
          >
            {busy ? "Sending…" : `Charge ${PAYMENT_LABEL[method]}`}
          </button>
        </div>
      </div>
    </div>
  );
}
