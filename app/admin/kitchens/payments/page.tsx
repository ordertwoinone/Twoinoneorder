"use client";
import { useCallback, useEffect, useState } from "react";
import OrderMoneyCard, { money, when, type ServedOrder } from "../OrderMoneyCard";
import { useNow } from "../OrderTimer";
import TakePaymentDialog from "../TakePaymentDialog";
import { balanceDue, PAYMENT_METHOD_LABELS as METHOD_LABEL } from "@/lib/kitchen-payments";

const REFRESH_MS = 15_000;

const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
const methodBtn = "flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50";

export default function KitchenPaymentsAdmin() {
  const now = useNow();
  const [unpaid, setUnpaid] = useState<ServedOrder[]>([]);
  const [paid, setPaid] = useState<ServedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<"unpaid" | "paid">("unpaid");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  // The order whose credit details are being typed.
  const [creditFor, setCreditFor] = useState<string | null>(null);
  const [creditName, setCreditName] = useState("");
  const [creditPhone, setCreditPhone] = useState("");
  const [paying, setPaying] = useState<ServedOrder | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/kitchens/payments").catch(() => null);
    const data = await res?.json().catch(() => null);
    setLoading(false);
    if (!res?.ok || !Array.isArray(data?.unpaid) || !Array.isArray(data?.paid)) {
      setLoadError(data?.error ?? "Could not load the payments.");
      return;
    }
    setLoadError("");
    setUnpaid(data.unpaid);
    setPaid(data.paid);
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  async function send(id: string, body: Record<string, unknown>): Promise<boolean> {
    setBusyId(id);
    setActionError("");
    const res = await fetch(`/api/admin/kitchens/payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setActionError(data?.error ?? "That order couldn't be updated. Please try again.");
    }
    await load();
    setBusyId(null);
    return Boolean(res?.ok);
  }

  function openCredit(id: string) {
    setActionError("");
    setCreditName("");
    setCreditPhone("");
    setCreditFor(id);
  }

  async function saveCredit(id: string) {
    const ok = await send(id, { action: "credit", name: creditName, phone: creditPhone });
    if (ok) setCreditFor(null);
  }

  const owed = unpaid.reduce((sum, o) => sum + balanceDue(o), 0);
  const visible = view === "unpaid" ? unpaid : paid;

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Kitchens Page</p>
        <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {unpaid.length} unpaid · {money(owed)} to collect · updates every 15 seconds
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {([["unpaid", `Not paid (${unpaid.length})`], ["paid", "Paid"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            aria-pressed={view === id}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${view === id ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loadError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
          <span className="block text-xs mt-1 text-red-600">If something is missing, run supabase/kitchen_order_payments.sql and supabase/kitchen_order_credit.sql in the Supabase SQL editor.</span>
        </div>
      )}
      {actionError && <p role="alert" className="mb-4 text-sm text-red-600">{actionError}</p>}
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {notice}
          <button onClick={() => setNotice("")} className="ms-3 text-xs underline">OK</button>
        </p>
      )}

      {paying && (
        <TakePaymentDialog
          order={paying}
          endpoint="/api/admin/kitchens/payments"
          onClose={() => setPaying(null)}
          onSaved={(change) => {
            setPaying(null);
            setNotice(change > 0 ? `Saved. Give ${money(change)} change.` : "");
            load();
          }}
        />
      )}

      {loading ? (
        <p className="text-center py-16 text-gray-400 text-sm">Loading...</p>
      ) : visible.length === 0 ? (
        <p className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
          {view === "unpaid" ? "Nothing to collect. New orders appear here until they're paid." : "No paid orders yet."}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((order) => {
            const busy = busyId === order.id;
            const method = METHOD_LABEL[order.payment_method ?? ""];
            return order.paid_at ? (
              <OrderMoneyCard
                key={order.id}
                order={order}
                now={now}
                badge={`Paid${method ? ` · ${method}` : ""}`}
                badgeCls="bg-green-100 text-green-700"
              >
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">
                    {when(order.paid_at)}{order.credit_at ? " · was on credit" : ""}
                  </span>
                  <button
                    onClick={() => send(order.id, { action: "undo" })}
                    disabled={busy}
                    className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                  >
                    Mark not paid
                  </button>
                </div>
              </OrderMoneyCard>
            ) : (
              <OrderMoneyCard key={order.id} order={order} now={now} badge="Not paid" badgeCls="bg-red-100 text-red-700">
                {creditFor === order.id ? (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      value={creditName}
                      onChange={(e) => setCreditName(e.target.value)}
                      placeholder="Customer name"
                      aria-label="Customer name"
                      className={inputCls}
                    />
                    <input
                      type="tel"
                      value={creditPhone}
                      onChange={(e) => setCreditPhone(e.target.value)}
                      placeholder="Phone number"
                      aria-label="Phone number"
                      className={inputCls}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setCreditFor(null)} className={`${methodBtn} text-gray-700 bg-gray-100 hover:bg-gray-200`}>Back</button>
                      <button onClick={() => saveCredit(order.id)} disabled={busy} className={`${methodBtn} text-white`} style={{ background: "#ea580c" }}>Save on credit</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="flex gap-2">
                      <button onClick={() => send(order.id, { action: "pay", method: "card" })} disabled={busy} className={`${methodBtn} text-white`} style={{ background: "#ea580c" }}>Card</button>
                      <button onClick={() => send(order.id, { action: "pay", method: "cash" })} disabled={busy} className={`${methodBtn} text-white`} style={{ background: "#ea580c" }}>Cash</button>
                      <button onClick={() => openCredit(order.id)} disabled={busy} className={`${methodBtn} text-gray-800 bg-white border border-gray-300 hover:bg-gray-50`}>Credit</button>
                    </div>
                    <button
                      onClick={() => { setActionError(""); setPaying(order); }}
                      disabled={busy}
                      className={`${methodBtn} mt-2 w-full text-gray-800 bg-gray-100 hover:bg-gray-200`}
                    >
                      Discount or split payment
                    </button>
                  </div>
                )}
              </OrderMoneyCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
