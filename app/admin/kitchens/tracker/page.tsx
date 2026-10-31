"use client";
import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { money, when } from "../OrderMoneyCard";
import OrderTimer, { useNow } from "../OrderTimer";
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
  served_at?: string | null;
  created_at: string;
}

const REFRESH_MS = 15_000;
const NO_WAITER = "__none__";

const STEPS: { status: KitchenOrderStatus; label: string }[] = [
  { status: "new", label: "Received" },
  { status: "preparing", label: "Preparing" },
  { status: "served", label: "Served" },
];

const onCredit = (o: TrackedOrder) => !o.paid_at && o.payment_method === "credit";

/** Done with: cancelled, or served and either paid or moved to credit. */
const isFinished = (o: TrackedOrder) =>
  o.status === "cancelled" || (o.status === "served" && (Boolean(o.paid_at) || onCredit(o)));

/** Where the order is right now, in a sentence. */
function whereNow(o: TrackedOrder): string {
  if (o.status === "cancelled") return "Cancelled";
  if (o.status === "new") return "Waiting for the kitchen";
  if (o.status === "preparing") return "Being prepared";
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
  return { label: "Not paid", cls: "bg-red-100 text-red-700" };
}

export default function KitchenOrderTracker() {
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<"progress" | "finished" | "all">("progress");
  const [waiter, setWaiter] = useState("");
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

  const waiters = Array.from(new Set(orders.map((o) => o.waiter_name).filter(Boolean))) as string[];
  const inProgress = orders.filter((o) => !isFinished(o)).length;

  const visible = orders.filter((o) => {
    if (view === "progress" && isFinished(o)) return false;
    if (view === "finished" && !isFinished(o)) return false;
    if (waiter === NO_WAITER) return !o.waiter_name;
    return !waiter || o.waiter_name === waiter;
  });

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Kitchens Page</p>
        <h1 className="text-2xl font-semibold text-gray-900">Order Tracker</h1>
        <p className="text-sm text-gray-500 mt-0.5">{inProgress} in progress · updates every 15 seconds</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {([["progress", `In progress (${inProgress})`], ["finished", "Finished"], ["all", "All"]] as const).map(([id, label]) => (
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
              <article key={order.id} className={`flex flex-col bg-white rounded-xl border border-gray-200 p-4 ${cancelled ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900">
                      #{order.order_number}{order.table_code ? ` · Table ${order.table_code}` : ""}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {when(order.created_at)} · {order.guests} {order.guests === 1 ? "person" : "people"}
                    </p>
                  </div>
                  <OrderTimer from={order.created_at} servedAt={order.served_at} status={order.status} now={now} />
                </div>

                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {order.waiter_name ? `Waiter: ${order.waiter_name}` : "No waiter"}
                </p>

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
                  {(order.items ?? []).map((item) => `${item.qty} × ${item.name}`).join(", ")}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${pill.cls}`}>{pill.label}</span>
                  <span className="text-sm font-bold text-gray-900">{money(Number(order.total))}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
