"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { roundMoney } from "@/lib/kalba/pricing";
import { money, type ServedOrder } from "./OrderMoneyCard";

const inputCls = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
const labelCls = "block text-xs font-semibold text-gray-700 mb-1";

const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

/**
 * Discount, cash and card in any mix. Whatever is left stays as a balance to pay
 * later, or goes on credit.
 */
export default function TakePaymentDialog({
  order, endpoint, onClose, onSaved,
}: {
  order: ServedOrder;
  /** The Payments or Credit route, whichever screen it was opened from. */
  endpoint: string;
  onClose: () => void;
  onSaved: (change: number) => void;
}) {
  const total = Number(order.total);
  const already = Number(order.paid_amount ?? 0);
  const onCredit = order.payment_method === "credit";

  const [discountMode, setDiscountMode] = useState<"aed" | "percent">("aed");
  const [discountInput, setDiscountInput] = useState(Number(order.discount ?? 0) ? String(Number(order.discount)) : "");
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [toCredit, setToCredit] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const discount = roundMoney(discountMode === "percent" ? (total * num(discountInput)) / 100 : num(discountInput));
  const due = roundMoney(total - discount - already);
  const taken = roundMoney(num(cash) + num(card));
  const change = Math.max(0, roundMoney(taken - due));
  const left = Math.max(0, roundMoney(due - taken));
  const invalid = [discount, num(cash), num(card)].some((n) => !Number.isFinite(n) || n < 0) || due < 0;

  /** Fills one field with whatever the other leaves. */
  const rest = (other: string) => String(Math.max(0, roundMoney(due - num(other))));

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`${endpoint}/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "settle",
        discount,
        cash: num(cash),
        card: num(card),
        credit: left > 0 && toCredit && !onCredit ? { name, phone } : null,
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      setError(data?.error ?? "That payment couldn't be saved. Please try again.");
      return;
    }
    onSaved(Number(data?.change ?? 0));
  }

  let outcome: string;
  if (left <= 0) outcome = "Paid in full";
  else if (onCredit) outcome = `${money(left)} stays on credit`;
  else if (toCredit) outcome = `${money(left)} goes on credit`;
  else outcome = `${money(left)} left to pay later`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-base font-semibold text-gray-900">
            Take payment · #{order.order_number}{order.table_code ? ` · Table ${order.table_code}` : ""}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="tp-discount" className="text-xs font-semibold text-gray-700">Discount</label>
              <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs font-semibold">
                {(["aed", "percent"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setDiscountMode(mode); setDiscountInput(""); }}
                    aria-pressed={discountMode === mode}
                    className={`px-2.5 py-1 rounded-md ${discountMode === mode ? "bg-gray-900 text-white" : "text-gray-600"}`}
                  >
                    {mode === "aed" ? "AED" : "%"}
                  </button>
                ))}
              </div>
            </div>
            <input
              id="tp-discount"
              type="number"
              inputMode="decimal"
              min="0"
              step={discountMode === "percent" ? "1" : "0.01"}
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </div>

          <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm space-y-0.5">
            <p className="flex justify-between text-gray-600"><span>Total</span><span>{money(total)}</span></p>
            {discount > 0 && <p className="flex justify-between text-gray-600"><span>Discount</span><span>-{money(discount)}</span></p>}
            {already > 0 && <p className="flex justify-between text-gray-600"><span>Already paid</span><span>-{money(already)}</span></p>}
            <p className="flex justify-between font-bold text-gray-900"><span>To pay</span><span>{money(Math.max(0, due))}</span></p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tp-cash" className={labelCls}>Cash (AED)</label>
              <input id="tp-cash" type="number" inputMode="decimal" min="0" step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0" className={inputCls} />
              <button type="button" onClick={() => setCash(rest(card))} className="mt-1 text-xs font-semibold text-orange-700 underline">Rest in cash</button>
            </div>
            <div>
              <label htmlFor="tp-card" className={labelCls}>Card (AED)</label>
              <input id="tp-card" type="number" inputMode="decimal" min="0" step="0.01" value={card} onChange={(e) => setCard(e.target.value)} placeholder="0" className={inputCls} />
              <button type="button" onClick={() => setCard(rest(cash))} className="mt-1 text-xs font-semibold text-orange-700 underline">Rest by card</button>
            </div>
          </div>

          {change > 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Change to give: {money(change)}</p>
          )}

          {left > 0 && !onCredit && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={toCredit} onChange={(e) => setToCredit(e.target.checked)} />
                Put the {money(left)} left on credit
              </label>
              {toCredit && (
                <>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" aria-label="Customer name" className={inputCls} />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" aria-label="Phone number" className={inputCls} />
                </>
              )}
            </div>
          )}

          <p className={`text-sm font-semibold ${left > 0 ? "text-red-700" : "text-green-700"}`}>{outcome}</p>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
          <button
            onClick={save}
            disabled={saving || invalid || (taken === 0 && discount === Number(order.discount ?? 0) && left > 0)}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "#ea580c" }}
          >
            {saving ? "Saving..." : "Save payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
