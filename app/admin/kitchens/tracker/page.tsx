"use client";
import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { money, when } from "../OrderMoneyCard";
import OrderTimer, { useNow, WaiterTimer } from "../OrderTimer";
import type { KitchenOrderStatus, OrderItem } from "@/lib/kitchen-orders";

interface TrackedOrder {
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
  round?: number | null;
  round_started_at?: string | null;
  paid_amount?: number | string | null;
  served_at?: string | null;
  created_at: string;
}

const REFRESH_MS = 15_000;
const NO_WAITER = "__none__";

const STEPS: { status: KitchenOrderStatus; label: string }[] = [
  { status: "new", label: "Received" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
  { status: "served", label: "Served" },
];

const onCredit = (o: TrackedOrder) => !o.paid_at && o.payment_method === "credit";

/** Where the order is right now, in a sentence. */
function whereNow(o: TrackedOrder): string {
  if (o.status === "cancelled") return "Cancelled";
  if (o.status === "new") return "Waiting for the kitchen";
  if (o.status === "preparing") return "Being prepared";
  if (o.status === "ready") return "Ready! Waiter to take it to the table";
  if (o.paid_at) return "Finished";
  return onCredit(o) ? "Served, on credit" : "Served, waiting for payment";
}

function paymentPill(o: TrackedOrder): { label: string; cls: string } {
  if (o.status === "cancelled") return { label: "No payment", cls: "bg-gray-100 text-gray-500" };
  if (o.paid_at) {
    const method = o.payment_method === "card" ? " · Card" : o.payment_method === "cash" ? " · Cash" : "";
    return { label: `Paid${method}`, cls: "bg-green-100 text-green-700" };
  }
  if (onCredit(o)) return { label: "On credit", cls: "bg-amber-100 text-amber-800" };
  const already = Number(o.paid_amount ?? 0);
  if (already > 0) return { label: `Balance ${money(Number(o.total) - already)}`, cls: "bg-red-100 text-red-700" };
  return { label: "Not paid", cls: "bg-red-100 text-red-700" };
}

export default function KitchenOrderTracker() {
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [waiter, setWaiter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const now = useNow();

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/kitchens/tracker").catch(() => null);
    const data = await res?.json().catch(() => null);
    setLoading(false);
    if (!res?.ok || !Array.isArray(data)) {
      setLoadError(data?.error ?? "Could not load the orders.");
      return;
    }
    setLoadError("");
    setOrders(data);
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  async function markServed(id: string) {
    setBusyId(id);
    setActionError("");
    const res = await fetch(`/api/admin/kitchens/tracker/${id}`, { method: "PATCH" }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setActionError(data?.error ?? "That order couldn't be updated. Please try again.");
    }
    await load();
    setBusyId(null);
  }

  const waiters = Array.from(new Set(orders.map((o) => o.waiter_name).filter(Boolean))) as string[];
  const inProgress = orders.length;

  const visible = orders
    .filter((o) => {
      if (waiter === NO_WAITER) return !o.waiter_name;
      return !waiter || o.waiter_name === waiter;
    })
    // Food going cold comes first, longest wait at the top.
    .sort((a, b) => {
      const aReady = a.status === "ready";
      const bReady = b.status === "ready";
      if (aReady !== bReady) return aReady ? -1 : 1;
      return aReady ? new Date(a.ready_at ?? 0).getTime() - new Date(b.ready_at ?? 0).getTime() : 0;
    });

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Kitchens Page</p>
        <h1 className="text-2xl font-semibold text-gray-900">Order Tracker</h1>
        <p className="text-sm text-gray-500 mt-0.5">{inProgress} in progress · updates every 15 seconds</p>
      </div>

      <div className="flex justify-end mb-4">
        <select
          value={waiter}
          onChange={(e) => setWaiter(e.target.value)}
          aria-label="Filter by waiter"
          className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="">All waiters</option>
          {waiters.map((name) => <option key={name} value={name}>{name}</option>)}
          <option value={NO_WAITER}>No waiter</option>
        </select>
      </div>

      {loadError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
      )}

      {actionError && <p role="alert" className="mb-4 text-sm text-red-600">{actionError}</p>}

      {loading ? (
        <p className="text-center py-16 text-gray-400 text-sm">Loading...</p>
      ) : visible.length === 0 ? (
        <p className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">No orders to show.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((order) => {
            const cancelled = order.status === "cancelled";
            const reached = STEPS.findIndex((s) => s.status === order.status);
            const pill = paymentPill(order);
            return (
              <article key={order.id} className={`flex flex-col rounded-xl border p-4 ${order.status === "ready" ? "kitchen-ready-card" : "bg-white border-gray-200"} ${cancelled ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900">
                      #{order.order_number}{order.table_code ? ` · Table ${order.table_code}` : ""}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {when(order.created_at)} · {order.guests} {order.guests === 1 ? "person" : "people"}
                    </p>
                  </div>
                  <OrderTimer from={order.round_started_at ?? order.created_at} readyAt={order.ready_at} servedAt={order.served_at} status={order.status} now={now} />
                </div>

                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {order.waiter_name ? `Waiter: ${order.waiter_name}` : "No waiter"}
                </p>

                {order.ready_at && (order.status === "ready" || order.status === "served") && (
                  <div className="mt-2">
                    <WaiterTimer readyAt={order.ready_at} servedAt={order.status === "served" ? order.served_at : null} now={now} />
                  </div>
                )}

                {(order.round ?? 1) > 1 && (
                  <p className="mt-2 inline-block self-start rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">Added items</p>
                )}

                <p className={`mt-3 text-sm font-bold ${cancelled ? "text-gray-500" : "text-gray-900"}`}>{whereNow(order)}</p>

                {!cancelled && (
                  <ol className="mt-2 flex items-center" aria-label={`Progress: ${whereNow(order)}`}>
                    {STEPS.map((step, i) => {
                      const done = i <= reached;
                      return (
                        <li key={step.status} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
                          <span className="flex flex-col items-center">
                            <span
                              aria-current={i === reached ? "step" : undefined}
                              className={`flex h-6 w-6 items-center justify-center rounded-full ${done ? "text-white" : "bg-gray-200 text-gray-400"}`}
                              style={done ? { background: "#ea580c" } : undefined}
                            >
                              {done && <Check size={14} strokeWidth={3} />}
                            </span>
                            <span className={`mt-1 text-[10px] font-semibold ${done ? "text-gray-800" : "text-gray-400"}`}>{step.label}</span>
                          </span>
                          {i < STEPS.length - 1 && (
                            <span className={`mx-1 mb-4 h-0.5 flex-1 ${i < reached ? "" : "bg-gray-200"}`} style={i < reached ? { background: "#ea580c" } : undefined} />
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}

                <p className="mt-3 flex-1 text-xs text-gray-600">
                  {(order.items ?? [])
                    .filter((item) => (item.round ?? 1) === (order.round ?? 1))
                    .map((item) => `${item.qty} × ${item.name}`)
                    .join(", ")}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${pill.cls}`}>{pill.label}</span>
                  <span className="text-sm font-bold text-gray-900">{money(Number(order.total))}</span>
                </div>

                {(order.status === "ready" || order.status === "preparing") && (
                  <button
                    onClick={() => markServed(order.id)}
                    disabled={busyId === order.id}
                    className={`mt-3 h-11 rounded-lg text-sm font-bold disabled:opacity-50 ${order.status === "ready" ? "bg-green-700 text-white hover:bg-green-800" : "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"}`}
                  >
                    Mark served
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
