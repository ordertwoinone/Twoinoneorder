"use client";
import { useCallback, useEffect, useState } from "react";
import type { OrderItem } from "@/lib/kitchen-orders";

interface ServedOrder {
  id: string;
  order_number: number;
  table_code: string | null;
  guests: number;
  waiter_name: string | null;
  items: OrderItem[];
  total: number | string;
  paid_at: string | null;
  created_at: string;
}

const REFRESH_MS = 15_000;

const money = (amount: number) => `AED ${amount.toFixed(2)}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function KitchenPaymentsAdmin() {
  const [unpaid, setUnpaid] = useState<ServedOrder[]>([]);
  const [paid, setPaid] = useState<ServedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<"unpaid" | "paid">("unpaid");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

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

  async function setPaidStatus(id: string, isPaid: boolean) {
    setBusyId(id);
    setActionError("");
    const res = await fetch(`/api/admin/kitchens/payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: isPaid }),
    }).catch(() => null);
    if (!res?.ok) setActionError("That order couldn't be updated. Please try again.");
    await load();
    setBusyId(null);
  }

  const owed = unpaid.reduce((sum, o) => sum + Number(o.total), 0);
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
          <span className="block text-xs mt-1 text-red-600">If something is missing, run supabase/kitchen_order_payments.sql in the Supabase SQL editor.</span>
        </div>
      )}
      {actionError && <p role="alert" className="mb-4 text-sm text-red-600">{actionError}</p>}

      {loading ? (
        <p className="text-center py-16 text-gray-400 text-sm">Loading...</p>
      ) : visible.length === 0 ? (
        <p className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
          {view === "unpaid" ? "Nothing to collect. Served orders appear here until they're paid." : "No paid orders yet."}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((order) => (
            <article key={order.id} className="flex flex-col bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900">
                    #{order.order_number}{order.table_code ? ` · Table ${order.table_code}` : ""}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {when(order.created_at)}
                    {" · "}{order.guests} {order.guests === 1 ? "person" : "people"}
                    {order.waiter_name ? ` · ${order.waiter_name}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${order.paid_at ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {order.paid_at ? "Paid" : "Not paid"}
                </span>
              </div>

              <ul className="mt-3 flex-1 space-y-1 text-sm">
                {(order.items ?? []).map((item, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-gray-800">
                      {item.qty} × {item.name}
                      {item.addons?.length ? <span className="block text-xs text-gray-500">{item.addons.map((a) => a.name).join(", ")}</span> : null}
                    </span>
                    <span className="shrink-0 text-gray-600">{money(Number(item.line_total))}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-sm font-semibold text-gray-600">Total</span>
                <span className="text-base font-bold text-gray-900">{money(Number(order.total))}</span>
              </div>

              {order.paid_at ? (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">Paid {when(order.paid_at)}</span>
                  <button
                    onClick={() => setPaidStatus(order.id, false)}
                    disabled={busyId === order.id}
                    className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                  >
                    Mark not paid
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setPaidStatus(order.id, true)}
                  disabled={busyId === order.id}
                  className="mt-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "#ea580c" }}
                >
                  Mark paid
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
