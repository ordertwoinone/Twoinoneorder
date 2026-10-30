"use client";
import { useCallback, useEffect, useState } from "react";
import OrderMoneyCard, { money, when, type ServedOrder } from "../OrderMoneyCard";

const REFRESH_MS = 15_000;

const METHOD_LABEL: Record<string, string> = { card: "card", cash: "cash" };

export default function KitchenCreditAdmin() {
  const [outstanding, setOutstanding] = useState<ServedOrder[]>([]);
  const [settled, setSettled] = useState<ServedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<"outstanding" | "settled">("outstanding");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/kitchens/credit").catch(() => null);
    const data = await res?.json().catch(() => null);
    setLoading(false);
    if (!res?.ok || !Array.isArray(data?.outstanding) || !Array.isArray(data?.settled)) {
      setLoadError(data?.error ?? "Could not load the credit list.");
      return;
    }
    setLoadError("");
    setOutstanding(data.outstanding);
    setSettled(data.settled);
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  async function send(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setActionError("");
    const res = await fetch(`/api/admin/kitchens/credit/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setActionError(data?.error ?? "That order couldn't be updated. Please try again.");
    }
    setRemoveId(null);
    await load();
    setBusyId(null);
  }

  const owed = outstanding.reduce((sum, o) => sum + Number(o.total), 0);
  const visible = view === "outstanding" ? outstanding : settled;

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Kitchens Page</p>
        <h1 className="text-2xl font-semibold text-gray-900">Credit</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {outstanding.length} on credit · {money(owed)} owed
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {([["outstanding", `Owing (${outstanding.length})`], ["settled", "Settled"]] as const).map(([id, label]) => (
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
          <span className="block text-xs mt-1 text-red-600">If something is missing, run supabase/kitchen_order_credit.sql in the Supabase SQL editor.</span>
        </div>
      )}
      {actionError && <p role="alert" className="mb-4 text-sm text-red-600">{actionError}</p>}

      {loading ? (
        <p className="text-center py-16 text-gray-400 text-sm">Loading...</p>
      ) : visible.length === 0 ? (
        <p className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
          {view === "outstanding" ? "Nobody owes anything." : "No settled credit yet."}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((order) => {
            const busy = busyId === order.id;
            const isSettled = Boolean(order.paid_at);
            return (
              <OrderMoneyCard
                key={order.id}
                order={order}
                badge={isSettled ? "Settled" : "Owing"}
                badgeCls={isSettled ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}
              >
                <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-sm font-semibold text-gray-900">{order.credit_name}</p>
                  {order.credit_phone && (
                    <a href={`tel:${order.credit_phone.replace(/[^\d+]/g, "")}`} className="text-sm font-medium text-orange-700 underline">
                      {order.credit_phone}
                    </a>
                  )}
                  {order.credit_at && <p className="text-xs text-gray-500 mt-0.5">On credit since {when(order.credit_at)}</p>}
                </div>

                {isSettled ? (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500">
                      Paid by {METHOD_LABEL[order.payment_method ?? ""] ?? "unknown"}, {when(order.paid_at as string)}
                    </span>
                    <button onClick={() => send(order.id, { action: "undo" })} disabled={busy} className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50">
                      Back to owing
                    </button>
                  </div>
                ) : removeId === order.id ? (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-2">Move back to Not paid? The customer&apos;s details will be removed.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setRemoveId(null)} className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200">Keep</button>
                      <button onClick={() => send(order.id, { action: "undo" })} disabled={busy} className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">Yes, move back</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-600 mb-1.5">Customer paid by</p>
                    <div className="flex gap-2">
                      <button onClick={() => send(order.id, { action: "pay", method: "card" })} disabled={busy} className="flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>Card</button>
                      <button onClick={() => send(order.id, { action: "pay", method: "cash" })} disabled={busy} className="flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>Cash</button>
                    </div>
                    <button onClick={() => setRemoveId(order.id)} className="mt-2 w-full text-xs font-semibold text-gray-500 underline">Credit added by mistake</button>
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
