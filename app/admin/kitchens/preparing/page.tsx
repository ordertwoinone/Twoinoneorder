"use client";
import { useCallback, useEffect, useState } from "react";
import { Lock, Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import type { KitchenOrderStatus, OrderItem } from "@/lib/kitchen-orders";
import { money, when } from "../OrderMoneyCard";
import OrderTimer, { useNow } from "../OrderTimer";
import AddItemsDialog from "../served/AddItemsDialog";

interface OpenOrder {
  id: string;
  order_number: number;
  table_code: string | null;
  guests: number;
  waiter_name: string | null;
  items: OrderItem[];
  total: number | string;
  status: KitchenOrderStatus;
  paid_at: string | null;
  round?: number | null;
  round_started_at?: string | null;
  ready_at?: string | null;
  served_at?: string | null;
  created_at: string;
}

const REFRESH_MS = 10_000;
const ENDPOINT = "/api/admin/kitchens/preparing";

const STATUS_STYLE: Partial<Record<KitchenOrderStatus, { label: string; cls: string }>> = {
  new: { label: "Waiting for the kitchen", cls: "bg-red-100 text-red-700" },
  preparing: { label: "Preparing", cls: "bg-amber-100 text-amber-800" },
  ready: { label: "Ready to serve", cls: "bg-green-200 text-green-900" },
};

const stepBtn = "flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40";

/**
 * Every order the kitchen still has, for waiters to change or add to. Each one
 * opens only with the PIN of the waiter who took it, and locks again after a save.
 */
export default function KitchenPreparingOrders() {
  const now = useNow();
  const [orders, setOrders] = useState<OpenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // The PIN each open order was unlocked with, sent again with every change.
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});
  const [pinFor, setPinFor] = useState<OpenOrder | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [checking, setChecking] = useState(false);
  // Quantities being changed, by order and then by item position.
  const [drafts, setDrafts] = useState<Record<string, Record<number, number>>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState<OpenOrder | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(ENDPOINT).catch(() => null);
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

  function lock(orderId: string) {
    setUnlocked((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    setErrors((prev) => ({ ...prev, [orderId]: "" }));
  }

  function askPin(order: OpenOrder) {
    setNotice("");
    setPin("");
    setPinError("");
    setPinFor(order);
  }

  async function checkPin() {
    if (!pinFor) return;
    setChecking(true);
    setPinError("");
    const res = await fetch(`${ENDPOINT}/${pinFor.id}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setChecking(false);
    if (!res?.ok) {
      setPinError(data?.error ?? "That PIN couldn't be checked. Please try again.");
      setPin("");
      return;
    }
    setUnlocked((prev) => ({ ...prev, [pinFor.id]: pin }));
    setPinFor(null);
    setPin("");
  }

  function setQty(orderId: string, index: number, qty: number) {
    setDrafts((prev) => ({ ...prev, [orderId]: { ...prev[orderId], [index]: Math.max(0, Math.min(99, qty)) } }));
  }

  async function save(order: OpenOrder) {
    const draft = drafts[order.id] ?? {};
    const items = Object.entries(draft)
      .map(([index, qty]) => ({ index: Number(index), qty }))
      .filter(({ index, qty }) => order.items[index] && order.items[index].qty !== qty);
    if (items.length === 0) return lock(order.id);

    setBusyId(order.id);
    setErrors((prev) => ({ ...prev, [order.id]: "" }));
    const res = await fetch(`${ENDPOINT}/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: unlocked[order.id], items }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusyId(null);
    if (!res?.ok) {
      setErrors((prev) => ({ ...prev, [order.id]: data?.error ?? "Those changes couldn't be saved. Please try again." }));
      return;
    }
    lock(order.id);
    setNotice(`Order #${order.order_number} changed. The kitchen has been told.`);
    load();
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-4">
        <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Kitchens Page</p>
        <h1 className="text-2xl font-semibold text-gray-900">Preparing Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {orders.length} open · the order&apos;s own waiter types their PIN to change it · updates every 10 seconds
        </p>
      </div>

      {loadError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
      )}
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {notice}
          <button onClick={() => setNotice("")} className="ms-3 text-xs underline">OK</button>
        </p>
      )}

      {loading ? (
        <p className="text-center py-16 text-gray-400 text-sm">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">No orders being made right now.</p>
      ) : (
        <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {orders.map((order) => {
            const round = order.round ?? 1;
            const open = order.id in unlocked;
            const canChangeQty = open && (order.status === "new" || order.status === "preparing") && !order.paid_at;
            const draft = drafts[order.id] ?? {};
            const qtyOf = (i: number) => draft[i] ?? order.items[i].qty;
            const dirty = Object.entries(draft).some(([i, q]) => order.items[Number(i)]?.qty !== q);
            const draftTotal = order.items.reduce(
              (sum, item, i) => sum + ((item.round ?? 1) === round ? Number(item.unit_price) * qtyOf(i) : Number(item.line_total)),
              0,
            );
            const style = STATUS_STYLE[order.status];
            const busy = busyId === order.id;
            return (
              <article key={order.id} className={`flex flex-col rounded-xl border bg-white p-3 ${open ? "border-orange-400 ring-2 ring-orange-100" : "border-gray-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900">
                      #{order.order_number}{order.table_code ? ` · Table ${order.table_code}` : ""}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {when(order.created_at)} · {order.guests} {order.guests === 1 ? "person" : "people"}
                    </p>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">
                      {order.waiter_name ? `Waiter: ${order.waiter_name}` : "No waiter"}
                    </p>
                  </div>
                  {style && <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${style.cls}`}>{style.label}</span>}
                </div>

                <div className="mt-1.5">
                  <OrderTimer from={order.round_started_at ?? order.created_at} readyAt={order.ready_at} servedAt={order.served_at} status={order.status} now={now} />
                </div>

                <ul className="mt-2 divide-y divide-gray-100 text-sm">
                  {order.items.map((item, i) => {
                    const current = (item.round ?? 1) === round;
                    const qty = qtyOf(i);
                    const stepper = canChangeQty && current;
                    return (
                      <li key={i} className={`flex items-center gap-2 py-1.5 ${current ? "" : "opacity-50"} ${qty === 0 ? "line-through text-gray-400" : ""}`}>
                        <span className="min-w-0 flex-1">
                          <span className="font-medium text-gray-800">{stepper ? item.name : `${item.qty} × ${item.name}`}</span>
                          {item.addons?.length ? <span className="block text-xs text-gray-500">{item.addons.map((a) => a.name).join(", ")}</span> : null}
                          {!current && <span className="block text-[11px] text-gray-500">Already served</span>}
                        </span>
                        {stepper ? (
                          <span className="flex shrink-0 items-center gap-1">
                            <button type="button" onClick={() => setQty(order.id, i, qty - 1)} disabled={qty === 0} aria-label={`One less ${item.name}`} className={stepBtn}>
                              {qty === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                            </button>
                            <span className="w-6 text-center font-bold tabular-nums">{qty}</span>
                            <button type="button" onClick={() => setQty(order.id, i, qty + 1)} aria-label={`One more ${item.name}`} className={stepBtn}>
                              <Plus size={14} />
                            </button>
                          </span>
                        ) : (
                          <span className="shrink-0 text-gray-600">{money(Number(item.line_total))}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                  <span className="text-sm font-semibold text-gray-600">Total</span>
                  <span className="text-sm font-bold text-gray-900">
                    {dirty && <span className="me-2 text-xs font-normal text-gray-400 line-through">{money(Number(order.total))}</span>}
                    {money(dirty ? draftTotal : Number(order.total))}
                  </span>
                </div>

                {open && !canChangeQty && (
                  <p className="mt-2 text-xs text-gray-500">
                    {order.status === "ready"
                      ? "Ready in the kitchen, so items can only be added. They go back to the kitchen as a new round."
                      : "Already paid, so items can only be added."}
                  </p>
                )}
                {errors[order.id] && <p role="alert" className="mt-2 text-sm text-red-600">{errors[order.id]}</p>}

                {!open ? (
                  <button
                    onClick={() => askPin(order)}
                    className="mt-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    <Pencil size={15} />
                    Change order
                  </button>
                ) : dirty ? (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setDrafts((prev) => ({ ...prev, [order.id]: {} }))} className="flex-1 h-10 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200">Undo</button>
                    <button onClick={() => save(order)} disabled={busy} className="flex-1 h-10 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
                      {busy ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => lock(order.id)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-200">
                      <Lock size={14} />
                      Done
                    </button>
                    <button
                      onClick={() => { setNotice(""); setAdding(order); }}
                      className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-white"
                      style={{ background: "#ea580c" }}
                    >
                      <Plus size={16} />
                      Add items
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {pinFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <form
            onSubmit={(e) => { e.preventDefault(); checkPin(); }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h2 className="text-base font-semibold text-gray-900">Change order #{pinFor.order_number}</h2>
              <button type="button" onClick={() => setPinFor(null)} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              {pinFor.waiter_name ? `${pinFor.waiter_name}, type your PIN.` : "Type your waiter PIN."}
            </p>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              aria-label="Waiter PIN"
              className="w-full px-3.5 py-3 rounded-lg border border-gray-200 text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {pinError && <p role="alert" className="mt-2 text-sm text-red-600">{pinError}</p>}
            <button
              type="submit"
              disabled={pin.length !== 4 || checking}
              className="mt-3 w-full h-11 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "#ea580c" }}
            >
              {checking ? "Checking..." : "Unlock"}
            </button>
          </form>
        </div>
      )}

      {adding && (
        <AddItemsDialog
          orderId={adding.id}
          orderLabel={`order #${adding.order_number}`}
          endpoint={ENDPOINT}
          extra={{ pin: unlocked[adding.id] }}
          onClose={() => setAdding(null)}
          onSent={() => {
            setNotice(`Items added to order #${adding.order_number}. The kitchen has been told.`);
            lock(adding.id);
            setAdding(null);
            load();
          }}
        />
      )}
    </div>
  );
}
