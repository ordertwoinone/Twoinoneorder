"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCw, Volume2, VolumeX, AlertTriangle, Store, Phone, Clock,
  CalendarClock, StickyNote, BellRing, X, Wifi, WifiOff,
} from "lucide-react";

/* ── Shapes as take.app returns them ─────────────────────────────────────── */

interface LineItem {
  name: string;
  quantity: number;
  price: number;
  options?: { name?: string; value?: string }[] | null;
}

interface Order {
  id: string;
  number: string;
  name: string;
  store: { name: string; alias: string } | null;
  order_status: string;
  payment_status: string;
  fulfillment_status: string;
  customer: { name?: string | null; phone?: string | null } | null;
  line_items: LineItem[];
  total_amount: number;
  currency: string;
  created_at: string;
  remark?: string | null;
  schedule?: string | null;
}

/** How long a just-arrived order keeps its ring. */
const NEW_ORDER_MS = 60_000;

/** How long a toast stays up before it slides away on its own. */
const TOAST_MS = 12_000;

/** Live connection state, as the header pill reports it. */
type Connection = "connecting" | "live" | "offline";

/** One frame off the SSE stream. */
interface LiveEvent {
  isNew: boolean;
  event: string;
  order: Order;
}

interface Toast {
  key: number;
  orderNumber: string;
  storeName: string;
  total: string;
}

const ORDER_STATUSES = ["draft", "pending", "confirmed", "completed", "cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "refunded"];
const FULFILLMENT_STATUSES = ["unfulfilled", "ready", "fulfilled"];

const ORDER_CHIPS: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600",
  pending:   "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const PAYMENT_CHIPS: Record<string, string> = {
  pending:  "bg-yellow-50 text-yellow-700 border border-yellow-200",
  paid:     "bg-green-50 text-green-700 border border-green-200",
  refunded: "bg-purple-50 text-purple-700 border border-purple-200",
};

const FULFILLMENT_CHIPS: Record<string, string> = {
  unfulfilled: "bg-orange-50 text-orange-700 border border-orange-200",
  ready:       "bg-blue-50 text-blue-700 border border-blue-200",
  fulfilled:   "bg-gray-50 text-gray-600 border border-gray-200",
};

/** take.app sends the smallest unit — fils here, so 1250 is AED 12.50. */
function money(amount: number, currency: string) {
  const value = (amount ?? 0) / 100;
  return `${currency || "AED"} ${value.toFixed(2)}`;
}

function clockTime(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-AE", { hour: "numeric", minute: "2-digit" });
}

function sinceLabel(iso: string) {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const selectCls = "px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function LiveOrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [fulfillmentStatus, setFulfillmentStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [store, setStore] = useState("");

  const [soundOn, setSoundOn] = useState(false);
  const [newIds, setNewIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [connection, setConnection] = useState<Connection>("connecting");

  // Ids of every order already on screen, so a webhook for an order we are
  // showing reads as an update rather than an arrival.
  const seenIds = useRef<Set<string>>(new Set());
  const audioCtx = useRef<AudioContext | null>(null);
  // The live handler is rebuilt whenever sound is toggled; the stream must not
  // be, so it reads the newest handler through a ref instead of a dependency.
  const onLiveOrder = useRef<(payload: LiveEvent) => void>(() => {});

  /* A short two-tone chime, synthesised so the page carries no audio asset.
     Browsers only allow this after a gesture — the Sound button is that
     gesture, which is why the alert is opt-in rather than on by default. */
  const chime = useCallback(() => {
    const ctx = audioCtx.current;
    if (!ctx) return;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }, []);

  function toggleSound() {
    if (!soundOn) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        audioCtx.current = audioCtx.current ?? new Ctor();
        audioCtx.current.resume();
      }
      setSoundOn(true);
      chime();
    } else {
      setSoundOn(false);
    }
  }

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (orderStatus) params.set("order_status", orderStatus);
    if (paymentStatus) params.set("payment_status", paymentStatus);
    if (fulfillmentStatus) params.set("fulfillment_status", fulfillmentStatus);
    // The API filters from a date; "to" is applied below, where we have the rows.
    if (fromDate) params.set("created_after", new Date(`${fromDate}T00:00:00`).toISOString());

    try {
      const res = await fetch(`/api/admin/takeapp/orders?${params}`, { cache: "no-store" });
      const body = await res.json();
      // The reason travels as `warning` when stored orders came through anyway,
      // and as `error` when nothing did — show whichever is there.
      if (!res.ok) throw new Error(body?.error || body?.warning || `Request failed (${res.status})`);

      const incoming: Order[] = Array.isArray(body.orders) ? body.orders : [];

      // Everything loaded here is already known — only the webhook announces
      // arrivals from now on.
      seenIds.current = new Set(incoming.map((o) => o.id));

      setOrders(incoming);
      // A warning means the merchant API failed but stored orders came through.
      setError(typeof body.warning === "string" ? body.warning : "");
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [orderStatus, paymentStatus, fulfillmentStatus, fromDate]);

  // The list is loaded once on open and again whenever a filter changes; live
  // changes arrive on the stream below rather than on a timer.
  useEffect(() => { load(); }, [load]);

  /* An order pushed from the webhook. Replaces the row when we already have it,
     otherwise drops it in at the top and announces it. */
  const handleLiveOrder = useCallback(({ order, isNew }: LiveEvent) => {
    if (!order?.id) return;

    setOrders((prev) => {
      const rest = prev.filter((o) => o.id !== order.id);
      return [order, ...rest].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    });
    setLastUpdated(new Date());

    const firstTime = isNew && !seenIds.current.has(order.id);
    seenIds.current.add(order.id);
    if (!firstTime) return;

    setNewIds((prev) => [...prev, order.id]);
    window.setTimeout(
      () => setNewIds((prev) => prev.filter((id) => id !== order.id)),
      NEW_ORDER_MS,
    );

    const key = Date.now() + Math.random();
    setToasts((prev) => [
      ...prev,
      {
        key,
        orderNumber: order.number || order.name || order.id.slice(0, 8),
        storeName: order.store?.name || "Unknown store",
        total: money(order.total_amount, order.currency),
      },
    ]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.key !== key)), TOAST_MS);

    if (soundOn) chime();
  }, [soundOn, chime]);

  useEffect(() => { onLiveOrder.current = handleLiveOrder; }, [handleLiveOrder]);

  /* The live connection. EventSource reconnects on its own after a drop or the
     platform's response cap, so this is opened once for the life of the screen
     — filters are applied to what is already in state, not re-subscribed. */
  useEffect(() => {
    const source = new EventSource("/api/admin/takeapp/stream");

    source.addEventListener("ready", () => setConnection("live"));
    source.addEventListener("order", (e) => {
      try {
        onLiveOrder.current(JSON.parse((e as MessageEvent).data) as LiveEvent);
      } catch { /* a malformed frame must not take the stream down */ }
    });
    source.onopen = () => setConnection("live");
    source.onerror = () => setConnection((prev) => (prev === "live" ? "offline" : "connecting"));

    return () => source.close();
  }, []);

  const stores = useMemo(
    () => Array.from(new Set(orders.map((o) => o.store?.name).filter(Boolean) as string[])).sort(),
    [orders],
  );

  const shown = useMemo(() => {
    const cutoff = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    return orders.filter((o) => {
      if (store && o.store?.name !== store) return false;
      if (cutoff && new Date(o.created_at).getTime() > cutoff) return false;
      return true;
    });
  }, [orders, store, toDate]);

  // Grouped by restaurant, each group newest first.
  const groups = useMemo(() => {
    const map = new Map<string, Order[]>();
    shown.forEach((o) => {
      const key = o.store?.name || "Unknown store";
      map.set(key, [...(map.get(key) ?? []), o]);
    });
    return Array.from(map.entries())
      .map(([name, rows]) => [
        name,
        [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      ] as const)
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [shown]);

  const pendingCount = shown.filter((o) => o.order_status === "pending").length;
  const newCount = shown.filter((o) => newIds.includes(o.id)).length;

  function resetFilters() {
    setOrderStatus(""); setPaymentStatus(""); setFulfillmentStatus("");
    setFromDate(""); setToDate(""); setStore("");
  }

  return (
    <div className="p-4 sm:p-8">

      {/* Toasts — one per order the webhook has just announced */}
      <div className="fixed top-4 end-4 z-50 flex flex-col gap-2 w-[290px] pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.key}
            className="pointer-events-auto bg-white rounded-xl shadow-lg border border-orange-200 p-3.5 flex items-start gap-3 pop-in"
          >
            <span className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <BellRing size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-gray-900">New order #{toast.orderNumber}</p>
              <p className="text-xs text-gray-500 truncate">{toast.storeName}</p>
              <p className="text-xs font-bold text-orange-600 mt-0.5">{toast.total}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.key !== toast.key))}
              className="text-gray-300 hover:text-gray-500 shrink-0"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">take.app</p>
          <h1 className="text-2xl font-semibold text-gray-900">Live Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
              connection === "live"
                ? "bg-green-100 text-green-700"
                : connection === "connecting"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-600"
            }`}>
              {connection === "offline" ? <WifiOff size={11} /> : <Wifi size={11} />}
              {connection === "live" ? "Live" : connection === "connecting" ? "Connecting" : "Reconnecting"}
            </span>
            {shown.length} order{shown.length !== 1 ? "s" : ""} · {pendingCount} pending
            {lastUpdated && <span className="text-gray-400">· updated {clockTime(lastUpdated.toISOString())}</span>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition ${
              soundOn
                ? "bg-orange-50 border-orange-200 text-orange-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {soundOn ? "Alert on" : "Alert off"}
          </button>
          <button
            onClick={() => load()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {newCount > 0 && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-sm font-semibold">
          <BellRing size={16} className="shrink-0" />
          {newCount} new order{newCount !== 1 ? "s" : ""} just came in
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Orders could not be loaded</p>
            <p className="text-red-600/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Restaurant</span>
          <select value={store} onChange={(e) => setStore(e.target.value)} className={selectCls}>
            <option value="">All restaurants</option>
            {stores.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Order status</span>
          <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} className={`${selectCls} capitalize`}>
            <option value="">Any</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Payment</span>
          <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={`${selectCls} capitalize`}>
            <option value="">Any</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Fulfilment</span>
          <select value={fulfillmentStatus} onChange={(e) => setFulfillmentStatus(e.target.value)} className={`${selectCls} capitalize`}>
            <option value="">Any</option>
            {FULFILLMENT_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={selectCls} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={selectCls} />
        </label>

        <button
          onClick={resetFilters}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
        >
          Clear
        </button>
      </div>

      {/* Orders, grouped by restaurant */}
      {loading && orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm">Loading orders…</div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm">
          {error ? "Nothing to show while the feed is failing." : "No orders match these filters."}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([storeName, rows]) => (
            <section key={storeName}>
              <div className="flex items-center gap-2 mb-3">
                <Store size={15} className="text-orange-500" />
                <h2 className="text-base font-semibold text-gray-900">{storeName}</h2>
                <span className="text-xs font-semibold text-gray-400">
                  {rows.length} order{rows.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((o) => {
                  const isNew = newIds.includes(o.id);
                  const isPending = o.order_status === "pending";
                  return (
                    <article
                      key={o.id}
                      className={`bg-white rounded-xl border p-4 transition ${
                        isNew
                          ? "border-orange-400 ring-2 ring-orange-300 animate-pulse"
                          : isPending
                            ? "border-yellow-300 bg-yellow-50/40"
                            : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-extrabold text-gray-900 truncate">#{o.number || o.name || o.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock size={11} /> {clockTime(o.created_at)} · {sinceLabel(o.created_at)}
                          </p>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize shrink-0 ${ORDER_CHIPS[o.order_status] ?? "bg-gray-100 text-gray-600"}`}>
                          {o.order_status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PAYMENT_CHIPS[o.payment_status] ?? "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                          {o.payment_status || "—"}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${FULFILLMENT_CHIPS[o.fulfillment_status] ?? "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                          {o.fulfillment_status || "—"}
                        </span>
                      </div>

                      {(o.customer?.name || o.customer?.phone) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm font-semibold text-gray-800">{o.customer?.name || "—"}</p>
                          {o.customer?.phone && (
                            <a href={`tel:${o.customer.phone}`} className="text-xs text-gray-500 hover:text-orange-600 flex items-center gap-1 mt-0.5">
                              <Phone size={11} /> <span dir="ltr">{o.customer.phone}</span>
                            </a>
                          )}
                        </div>
                      )}

                      <ul className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                        {(o.line_items ?? []).map((item, i) => (
                          <li key={i} className="flex items-start justify-between gap-2 text-sm">
                            <span className="min-w-0">
                              <span className="font-semibold text-gray-700">{item.quantity}×</span>{" "}
                              <span className="text-gray-700">{item.name}</span>
                              {(item.options ?? []).length > 0 && (
                                <span className="block text-[11px] text-gray-400">
                                  {(item.options ?? [])
                                    .map((opt) => [opt.name, opt.value].filter(Boolean).join(": "))
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-gray-500 shrink-0">{money(item.price * item.quantity, o.currency)}</span>
                          </li>
                        ))}
                        {(o.line_items ?? []).length === 0 && (
                          <li className="text-xs text-gray-400">No items on this order.</li>
                        )}
                      </ul>

                      {o.schedule && (
                        <p className="mt-2.5 text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 flex items-center gap-1">
                          <CalendarClock size={11} className="shrink-0" /> {o.schedule}
                        </p>
                      )}

                      {o.remark && (
                        <p className="mt-2 text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 flex items-start gap-1">
                          <StickyNote size={11} className="shrink-0 mt-0.5" /> {o.remark}
                        </p>
                      )}

                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-400">Total</span>
                        <span className="text-base font-extrabold text-gray-900">{money(o.total_amount, o.currency)}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
