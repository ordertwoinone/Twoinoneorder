"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Printer, Volume2, VolumeX } from "lucide-react";
import { printDocument } from "@/lib/print-document";
import OrderTimer, { useNow } from "../OrderTimer";
import { useAlertChime } from "@/hooks/useAlertChime";
import { KITCHEN_LABELS } from "@/lib/kitchens";
import type { KitchenOrderStatus, OrderItem } from "@/lib/kitchen-orders";
import type { Kitchen } from "@/data/kitchenDishes";

interface KitchenOrder {
  id: string;
  order_number: number;
  table_code: string | null;
  guests: number;
  waiter_name: string | null;
  items: OrderItem[];
  total: number | string;
  status: KitchenOrderStatus;
  payment_method: "card" | "cash" | "credit" | null;
  paid_at: string | null;
  ready_at?: string | null;
  served_at?: string | null;
  created_at: string;
}

const REFRESH_MS = 15_000;

const STATUS_STYLE: Record<KitchenOrderStatus, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-red-100 text-red-700" },
  preparing: { label: "Preparing", cls: "bg-amber-100 text-amber-800" },
  ready: { label: "Ready", cls: "bg-green-200 text-green-900" },
  served: { label: "Served", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-500" },
};

const NEXT_STEP: Partial<Record<KitchenOrderStatus, { status: KitchenOrderStatus; label: string }>> = {
  new: { status: "preparing", label: "Start preparing" },
  preparing: { status: "ready", label: "Mark ready" },
};

export default function KitchenOrdersAdmin() {
  const now = useNow();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<"active" | "done">("active");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const { soundOn, toggle: toggleSound, chime } = useAlertChime("kitchen-order-alert");

  // Null until the first load, so opening the screen doesn't ring for old orders.
  const knownIds = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/kitchens/orders").catch(() => null);
    const data = await res?.json().catch(() => null);
    setLoading(false);
    if (!res?.ok || !Array.isArray(data)) {
      setLoadError(data?.error ?? "Could not load the orders.");
      return;
    }
    setLoadError("");
    const list = data as KitchenOrder[];
    const fresh = knownIds.current ? list.some((o) => !knownIds.current?.has(o.id)) : false;
    knownIds.current = new Set(list.map((o) => o.id));
    setOrders(list);
    if (fresh) chime();
  }, [chime]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  async function setStatus(id: string, status: KitchenOrderStatus) {
    setBusyId(id);
    setActionError("");
    const res = await fetch(`/api/admin/kitchens/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    setBusyId(null);
    setCancelId(null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setActionError(data?.error ?? "That order couldn't be updated. Please try again.");
      return;
    }
    load();
  }

  const isActive = (o: KitchenOrder) => o.status === "new" || o.status === "preparing" || o.status === "ready";
  // The kitchen is done once an order is ready; the waiter serves it from Order Tracker.
  const inKitchen = (o: KitchenOrder) => o.status === "new" || o.status === "preparing";
  const activeCount = orders.filter(inKitchen).length;
  const visible = orders.filter((o) => (view === "active" ? inKitchen(o) : !inKitchen(o)));

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Kitchens Page</p>
          <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeCount} active · updates every 15 seconds</p>
        </div>
        <button
          onClick={toggleSound}
          aria-pressed={soundOn}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${soundOn ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"}`}
        >
          {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          {soundOn ? "Sound on" : "Sound off"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {([["active", "Active"], ["done", "Ready & cancelled"]] as const).map(([id, label]) => (
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
          <span className="block text-xs mt-1 text-red-600">If the table is missing, run supabase/kitchen_orders.sql in the Supabase SQL editor.</span>
        </div>
      )}
      {actionError && <p role="alert" className="mb-4 text-sm text-red-600">{actionError}</p>}

      {loading ? (
        <p className="text-center py-16 text-gray-400 text-sm">Loading...</p>
      ) : visible.length === 0 ? (
        <p className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
          {view === "active" ? "No active orders." : "No finished orders yet."}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((order) => {
            const next = NEXT_STEP[order.status];
            const style = STATUS_STYLE[order.status];
            return (
              <article key={order.id} className="flex flex-col bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900">
                      #{order.order_number}{order.table_code ? ` · Table ${order.table_code}` : ""}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(order.created_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {" · "}{order.guests} {order.guests === 1 ? "person" : "people"}
                    </p>
                    <p className="text-xs font-medium text-gray-700 mt-0.5">
                      {order.waiter_name ? `Waiter: ${order.waiter_name}` : "No waiter"}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${style.cls}`}>{style.label}</span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <OrderTimer from={order.created_at} readyAt={order.ready_at} servedAt={order.served_at} status={order.status} now={now} />
                  <button
                    onClick={() => printDocument(`/admin/kitchens/receipt/${order.id}`)}
                    aria-label={`Print order ${order.order_number}`}
                    title="Print receipt"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Printer size={14} />
                    Print
                  </button>
                </div>

                <ul className="mt-3 flex-1 divide-y divide-gray-100 text-sm">
                  {(order.items ?? []).map((item, i) => (
                    <li key={i} className="py-2">
                      <div className="flex justify-between gap-3">
                        <span className="font-medium text-gray-800">{item.qty} × {item.name}</span>
                        <span className="shrink-0 text-gray-600">AED {Number(item.line_total).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {KITCHEN_LABELS[item.kitchen as Kitchen] ?? item.kitchen}
                        {item.addons?.length ? ` · ${item.addons.map((a) => a.name).join(", ")}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-sm font-semibold text-gray-600">Total</span>
                  <span className="text-base font-bold text-gray-900">AED {Number(order.total).toFixed(2)}</span>
                </div>

                {isActive(order) && (
                  cancelId === order.id ? (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-2">Cancel order #{order.order_number}?</p>
                      {/* Payments and Credit stop listing a cancelled order, so say so now. */}
                      {(order.paid_at || order.payment_method === "credit") && (
                        <p role="alert" className="text-xs font-semibold text-red-700 mb-2">
                          {order.paid_at
                            ? `Already paid by ${order.payment_method ?? "unknown"}. Refund the customer yourself.`
                            : "This is on credit. It will be removed from what the customer owes."}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => setCancelId(null)} className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200">Keep order</button>
                        <button onClick={() => setStatus(order.id, "cancelled")} disabled={busyId === order.id} className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">Yes, cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => setCancelId(order.id)} className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200">Cancel</button>
                      {next && (
                        <button onClick={() => setStatus(order.id, next.status)} disabled={busyId === order.id} className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
                          {next.label}
                        </button>
                      )}
                    </div>
                  )
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
