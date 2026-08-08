"use client";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCw, Volume2, VolumeX, AlertTriangle, Store, Phone, Clock,
  CalendarClock, StickyNote, BellRing, X, Wifi, WifiOff,
  Search, SlidersHorizontal, Download, ChevronDown,
} from "lucide-react";
import NotificationButton from "./NotificationButton";

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

/** The safety-net refresh, under the webhook stream. */
const REFRESH_MS = 30_000;

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

/** The statuses worth a dot in the header tally, in the order they appear. */
const TALLY_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

const STATUS_DOTS: Record<string, string> = {
  pending:   "bg-yellow-400",
  confirmed: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

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
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  /** The row whose items are showing; one at a time keeps the table scannable. */
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Ids of every order already on screen, so a webhook for an order we are
  // showing reads as an update rather than an arrival.
  const seenIds = useRef<Set<string>>(new Set());
  /** False until the first list has been loaded and taken as the baseline. */
  const seededRef = useRef(false);
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

  /**
   * Announces an order nobody has seen yet: the ring, the toast and the chime.
   * Shared by both routes in, and guarded by `seenIds`, so an order that
   * arrives on the stream and again on the next refresh is announced once.
   */
  const announce = useCallback((order: Order) => {
    if (!order?.id || seenIds.current.has(order.id)) return;
    seenIds.current.add(order.id);

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

      /* The first load is the baseline — announcing all of it would be a wall
         of toasts for orders that are hours old. Every refresh after that
         announces whatever is new, which is what makes the alert survive a
         webhook that is not configured yet or a stream that has dropped. */
      if (!seededRef.current) {
        seededRef.current = true;
        seenIds.current = new Set(incoming.map((o) => o.id));
      } else {
        incoming.forEach(announce);
      }

      setOrders(incoming);
      // A warning means the merchant API failed but stored orders came through.
      setError(typeof body.warning === "string" ? body.warning : "");
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [orderStatus, paymentStatus, fulfillmentStatus, fromDate, announce]);

  /* Loaded on open, on every filter change, and on a timer.
     The webhook stream is what makes an order appear the second it is placed;
     this refresh is the safety net under it — it covers a webhook that has not
     been set up, a delivery that failed, and a stream that dropped without the
     browser noticing. An order that both routes bring in is announced once. */
  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  /* An order pushed from the webhook. Replaces the row when we already have it,
     otherwise drops it in at the top and announces it. */
  const handleLiveOrder = useCallback(({ order, isNew }: LiveEvent) => {
    if (!order?.id) return;

    setOrders((prev) => {
      const rest = prev.filter((o) => o.id !== order.id);
      return [order, ...rest].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    });
    setLastUpdated(new Date());

    // An update to an order already on screen is not an arrival.
    if (isNew) announce(order);
    else seenIds.current.add(order.id);
  }, [announce]);

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

  /* Filters the API cannot apply — the store, the upper date bound and the
     search — are applied here, over what is already in state. */
  const shown = useMemo(() => {
    const cutoff = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    const needle = search.trim().toLowerCase();
    return orders
      .filter((o) => {
        if (store && o.store?.name !== store) return false;
        if (cutoff && new Date(o.created_at).getTime() > cutoff) return false;
        if (needle) {
          const haystack = `${o.number} ${o.name} ${o.id} ${o.customer?.name ?? ""} ${o.customer?.phone ?? ""}`.toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }, [orders, store, toDate, search]);

  const counts = useMemo(() => {
    const tally: Record<string, number> = {};
    shown.forEach((o) => { tally[o.order_status] = (tally[o.order_status] ?? 0) + 1; });
    return tally;
  }, [shown]);

  const newCount = shown.filter((o) => newIds.includes(o.id)).length;

  function resetFilters() {
    setOrderStatus(""); setPaymentStatus(""); setFulfillmentStatus("");
    setFromDate(""); setToDate(""); setStore(""); setSearch("");
  }

  /* The report is what is on screen, filters and all — downloading something
     other than what you are looking at would be a surprise. */
  function downloadReport() {
    const header = [
      "Order ID", "Placed", "Restaurant", "Order status", "Payment", "Fulfilment",
      "Customer", "Phone", "Items", "Total", "Currency", "Note",
    ];
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = shown.map((o) => [
      o.number || o.name || o.id,
      o.created_at,
      o.store?.name ?? "",
      o.order_status,
      o.payment_status,
      o.fulfillment_status,
      o.customer?.name ?? "",
      o.customer?.phone ?? "",
      (o.line_items ?? []).map((i) => `${i.quantity}x ${i.name}`).join(" | "),
      ((o.total_amount ?? 0) / 100).toFixed(2),
      o.currency || "AED",
      o.remark ?? "",
    ].map(escape).join(","));

    const blob = new Blob([[header.map(escape).join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const filtersOn = Boolean(orderStatus || paymentStatus || fulfillmentStatus || fromDate || toDate || store || search);

  return (
    <div className="p-4 sm:p-8">

      {/* Toasts — one per order the webhook has just announced */}
      <div
        className="fixed end-3 sm:end-4 z-50 flex flex-col gap-2 w-[290px] max-w-[calc(100vw-1.5rem)] pointer-events-none"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
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

      {/* Heading, live pill and the status tally */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">take.app</p>
          <h1 className="text-2xl font-semibold text-gray-900">Order History</h1>
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
            {shown.length} order{shown.length !== 1 ? "s" : ""}
            {lastUpdated && <span className="text-gray-400">· updated {clockTime(lastUpdated.toISOString())}</span>}
            <span className="text-gray-400 hidden sm:inline">· rechecks every {REFRESH_MS / 1000}s</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* One dot per status with its count, the way the partner dashboards show it */}
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-4 py-2 h-11">
            {TALLY_STATUSES.map((status) => (
              <span key={status} className="flex items-center gap-1.5" title={status}>
                <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOTS[status]}`} />
                <span className="text-[13px] font-bold text-gray-700">{counts[status] ?? 0}</span>
              </span>
            ))}
          </div>

          <NotificationButton />

          <button
            onClick={toggleSound}
            className={`flex items-center justify-center gap-2 px-4 h-11 rounded-lg text-sm font-semibold border transition flex-1 sm:flex-none ${
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
            className="flex items-center justify-center gap-2 px-4 h-11 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition flex-1 sm:flex-none"
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

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 px-3 sm:px-4 py-3 mb-4 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 px-3 h-11 rounded-lg border border-gray-200 flex-1 min-w-[180px] sm:flex-none">
          <Store size={14} className="text-gray-400 shrink-0" />
          <select value={store} onChange={(e) => setStore(e.target.value)} className="text-sm bg-transparent focus:outline-none w-full sm:w-auto">
            <option value="">All restaurants ({stores.length})</option>
            {stores.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className={`flex items-center justify-center gap-2 px-3 h-11 rounded-lg border text-sm font-medium transition shrink-0 ${
            filtersOn ? "border-orange-300 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <SlidersHorizontal size={14} /> Filters{filtersOn ? " · on" : ""}
        </button>

        <label className="flex items-center gap-2 px-3 h-11 rounded-lg border border-gray-200 w-full sm:flex-1 sm:w-auto sm:min-w-[200px]">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order ID, customer or phone"
            className="text-sm bg-transparent focus:outline-none w-full"
          />
        </label>

        <button
          onClick={downloadReport}
          disabled={shown.length === 0}
          className="flex items-center justify-center gap-2 px-4 h-11 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 w-full sm:w-auto"
        >
          <Download size={14} /> Download report
        </button>
      </div>

      {filtersOpen && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-3">
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
          <button onClick={resetFilters} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
            Clear
          </button>
        </div>
      )}


      {/* Phone view — one card per order, tap to open the items */}
      <div className="sm:hidden space-y-2.5">
        {loading && orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400 text-sm">Loading orders…</div>
        ) : shown.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400 text-sm">
            {error ? "Nothing to show while the feed is failing." : "No orders match these filters."}
          </div>
        ) : shown.map((o) => {
          const isNew = newIds.includes(o.id);
          const open = expandedId === o.id;
          const items = o.line_items ?? [];
          const itemCount = items.reduce((n, i) => n + (i.quantity ?? 0), 0);
          return (
            <div
              key={o.id}
              onClick={() => setExpandedId(open ? null : o.id)}
              className={`bg-white rounded-xl border p-3.5 transition ${
                isNew
                  ? "border-orange-400 ring-2 ring-orange-300"
                  : o.order_status === "pending"
                    ? "border-yellow-300 bg-yellow-50/50"
                    : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-extrabold text-gray-900 leading-tight">
                    #{o.number || o.name || o.id.slice(0, 10)}
                  </p>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <Clock size={10} className="shrink-0" />
                    <span className="whitespace-nowrap">{clockTime(o.created_at)} · {sinceLabel(o.created_at)}</span>
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide shrink-0 ${ORDER_CHIPS[o.order_status] ?? "bg-gray-100 text-gray-600"}`}>
                  {o.order_status}
                </span>
              </div>

              <div className="mt-2.5 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800 truncate">{o.store?.name || "—"}</p>
                  <p className="text-[12px] text-gray-500 truncate">
                    {o.customer?.name || "—"}
                    {itemCount > 0 && <span className="text-gray-400"> · {itemCount} item{itemCount !== 1 ? "s" : ""}</span>}
                  </p>
                </div>
                <p className="text-base font-extrabold text-gray-900 whitespace-nowrap shrink-0">
                  {money(o.total_amount, o.currency)}
                </p>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5 min-w-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PAYMENT_CHIPS[o.payment_status] ?? "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                    {o.payment_status || "—"}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${FULFILLMENT_CHIPS[o.fulfillment_status] ?? "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                    {o.fulfillment_status || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {o.customer?.phone && (
                    <a
                      href={`tel:${o.customer.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 active:bg-gray-100"
                      aria-label={`Call ${o.customer.name || "the customer"}`}
                    >
                      <Phone size={14} />
                    </a>
                  )}
                  <ChevronDown size={16} className={`text-gray-300 transition-transform ${open ? "rotate-180" : ""}`} />
                </div>
              </div>

              {open && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  <ul className="space-y-1.5">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 text-[13px]">
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
                        <span className="text-[12px] text-gray-500 shrink-0">{money(item.price * item.quantity, o.currency)}</span>
                      </li>
                    ))}
                    {items.length === 0 && <li className="text-[12px] text-gray-400">No items on this order.</li>}
                  </ul>

                  {o.schedule && (
                    <p className="text-[12px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                      <CalendarClock size={12} className="shrink-0" /> {o.schedule}
                    </p>
                  )}
                  {o.remark && (
                    <p className="text-[12px] text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                      <StickyNote size={12} className="shrink-0 mt-0.5" /> {o.remark}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* The orders themselves. A phone gets cards: eight columns cannot be read
          at 390px, and a sideways-scrolling table hides the total — the one
          number anyone is looking for. */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Restaurant</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subtotal</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && orders.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">Loading orders…</td></tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">
                  {error ? "Nothing to show while the feed is failing." : "No orders match these filters."}
                </td>
              </tr>
            ) : shown.map((o) => {
              const isNew = newIds.includes(o.id);
              const open = expandedId === o.id;
              const items = o.line_items ?? [];
              const itemCount = items.reduce((n, i) => n + (i.quantity ?? 0), 0);
              return (
                <Fragment key={o.id}>
                  <tr
                    onClick={() => setExpandedId(open ? null : o.id)}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      isNew
                        ? "bg-orange-50 ring-1 ring-inset ring-orange-300"
                        : o.order_status === "pending"
                          ? "bg-yellow-50/50 hover:bg-yellow-50"
                          : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wide ${ORDER_CHIPS[o.order_status] ?? "bg-gray-100 text-gray-600"}`}>
                        {o.order_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{o.number || o.name || o.id.slice(0, 10)}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> {clockTime(o.created_at)} · {sinceLabel(o.created_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="font-medium text-gray-800 truncate">{o.store?.name || "—"}</p>
                      {o.store?.alias && <p className="text-xs text-gray-400 truncate">{o.store.alias}</p>}
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="text-gray-700 truncate">{o.customer?.name || "—"}</p>
                      {o.customer?.phone && (
                        <a
                          href={`tel:${o.customer.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-gray-400 hover:text-orange-600 flex items-center gap-1"
                        >
                          <Phone size={10} /> <span dir="ltr">{o.customer.phone}</span>
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{itemCount || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PAYMENT_CHIPS[o.payment_status] ?? "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                          {o.payment_status || "—"}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${FULFILLMENT_CHIPS[o.fulfillment_status] ?? "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                          {o.fulfillment_status || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-gray-900 whitespace-nowrap">
                      {money(o.total_amount, o.currency)}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                    </td>
                  </tr>

                  {open && (
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
                            <ul className="space-y-1.5">
                              {items.map((item, i) => (
                                <li key={i} className="flex items-start justify-between gap-3">
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
                              {items.length === 0 && <li className="text-xs text-gray-400">No items on this order.</li>}
                            </ul>
                          </div>

                          <div className="space-y-2">
                            {o.schedule && (
                              <p className="text-[12px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                                <CalendarClock size={12} className="shrink-0" /> {o.schedule}
                              </p>
                            )}
                            {o.remark && (
                              <p className="text-[12px] text-gray-600 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                                <StickyNote size={12} className="shrink-0 mt-0.5" /> {o.remark}
                              </p>
                            )}
                            <p className="text-[11px] text-gray-400">Order reference: {o.id}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
