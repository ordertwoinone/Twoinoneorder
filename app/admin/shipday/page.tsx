"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCw, AlertTriangle, Phone, Clock, Truck, Wifi, WifiOff, Search,
  ChevronDown, MapPin, User, Bike, Package, CheckCircle2, Camera, StickyNote,
  Navigation, CreditCard, Users, DownloadCloud, Info,
} from "lucide-react";
import { statusLook, eventLabel, STATUS_LOOK, carrierIsOnline } from "@/lib/shipday";

/* ── Shapes as /api/admin/shipday returns them ───────────────────────────── */

interface Place {
  name?: string | null;
  address?: string | null;
  formatted_address?: string | null;
  phone?: string | null;
  location?: { lat?: number | null; lng?: number | null } | null;
}

interface Delivery {
  id: string;
  order_number: string;
  provider: string;
  last_event: string;
  order_status: string;
  event_at: string | null;
  carrier_id: number | null;
  carrier_name: string;
  carrier_phone: string;
  carrier_email: string;
  carrier_status: string;
  carrier_plate_number: string;
  carrier_vehicle: string;
  third_party_name: string;
  total_cost: number;
  delivery_fee: number;
  tip: number;
  payment_method: string;
  delivery_details: Place | null;
  pickup_details: Place | null;
  delivery_note: string;
  driving_distance: number;
  driving_duration: number;
  eta: string | null;
  placement_time: string | null;
  expected_delivery_time: string | null;
  assigned_time: string | null;
  start_time: string | null;
  pickedup_time: string | null;
  arrived_time: string | null;
  delivery_time: string | null;
  pod_urls: string[] | null;
  received_at: string;
  /** Filled when the order number matches a take.app order we already hold. */
  takeapp: { store: string; customer: string; phone: string } | null;
}

interface Carrier {
  id?: number | null;
  name?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  status?: string | null;
  isOnShift?: boolean | null;
}

type Connection = "connecting" | "live" | "offline";

/** The safety net under the stream, same as the Live Orders board. */
const REFRESH_MS = 60_000;
/** How long a freshly-changed row keeps its ring. */
const HIGHLIGHT_MS = 20_000;

/** The statuses worth a dot in the header tally, in the order they happen. */
const TALLY = [
  { status: "NOT_ASSIGNED",      dot: "bg-gray-400"   },
  { status: "STARTED",           dot: "bg-blue-500"   },
  { status: "PICKED_UP",         dot: "bg-indigo-500" },
  { status: "ALREADY_DELIVERED", dot: "bg-green-500"  },
  { status: "FAILED_DELIVERY",   dot: "bg-red-500"    },
];

/** Shipday sends a major-unit decimal, unlike take.app's smallest unit. */
function money(amount: number | null | undefined) {
  return `AED ${Number(amount ?? 0).toFixed(2)}`;
}

function clockTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-AE", { hour: "numeric", minute: "2-digit" });
}

function stampTime(at: Date) {
  return at.toLocaleTimeString("en-AE", { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function sinceLabel(iso: string | null) {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** One end of the journey as a line of text, preferring the tidied address. */
function placeLabel(place: Place | null | undefined) {
  if (!place) return "";
  const address = place.formatted_address || place.address || "";
  return [place.name, address].filter(Boolean).join(" — ");
}

/** Shipday sends metres and seconds; neither reads well raw. */
function distanceLabel(metres: number) {
  if (!metres) return "";
  return metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`;
}

function durationLabel(seconds: number) {
  if (!seconds) return "";
  const mins = Math.round(seconds / 60);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** The delivery's milestones, in order, skipping the ones that have not happened. */
function timeline(d: Delivery) {
  return [
    { label: "Order placed",   at: d.placement_time, icon: Package     },
    { label: "Driver assigned", at: d.assigned_time,  icon: User        },
    { label: "Driver started",  at: d.start_time,     icon: Navigation  },
    { label: "Picked up",       at: d.pickedup_time,  icon: Bike        },
    { label: "Arrived",         at: d.arrived_time,   icon: MapPin      },
    { label: "Delivered",       at: d.delivery_time,  icon: CheckCircle2 },
  ].filter((step) => step.at);
}

const selectCls = "px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function ShipdayAdmin() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carrierError, setCarrierError] = useState("");
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connection, setConnection] = useState<Connection>("connecting");

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [pulling, setPulling] = useState(false);
  /** What the last pull from Shipday found, shown until the next one. */
  const [pullNote, setPullNote] = useState("");
  /** Rows the stream has just touched, so a change is visible without a refresh. */
  const [movedIds, setMovedIds] = useState<string[]>([]);

  /* The live handler is rebuilt as state changes; the stream must not be, so it
     reads the newest handler through a ref instead of a dependency. */
  const onLive = useRef<(payload: { delivery: Delivery }) => void>(() => {});
  const onRemoved = useRef<(id: string) => void>(() => {});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shipday", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not load deliveries.");
      setDeliveries((body.deliveries ?? []) as Delivery[]);
      setConfigured(Boolean(body.configured));
      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load deliveries.");
    } finally {
      setLoading(false);
    }
  }, []);

  /* Loaded on open and on a timer. The stream is what makes an assignment show
     the second it happens; this is the safety net under it — it covers a
     webhook that has not been set up in Shipday, a delivery that failed, and a
     stream that dropped without the browser noticing. */
  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  /* The roster is the only part that needs the API key, so it is loaded on its
     own and its failure is kept away from the board. */
  const loadCarriers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/shipday/carriers", { cache: "no-store" });
      const body = await res.json();
      setCarriers((body.carriers ?? []) as Carrier[]);
      setCarrierError(body.error ?? "");
    } catch {
      setCarrierError("Could not reach Shipday.");
    }
  }, []);

  useEffect(() => { loadCarriers(); }, [loadCarriers]);

  /**
   * Ask Shipday for the orders it already holds.
   *
   * The webhook only reports what happens next, so anything Shipday took
   * before it was connected is invisible until this is pressed. It doubles as
   * the diagnosis: "Shipday has no orders" is a different problem from "the
   * webhook is not arriving", and only this can tell them apart.
   */
  async function pullFromShipday() {
    setPulling(true);
    setPullNote("");
    try {
      const res = await fetch("/api/admin/shipday/backfill", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not reach Shipday.");
      setPullNote(
        body.found === 0
          ? "Shipday returned no orders at all — active or historic — so nothing is reaching Shipday in the first place."
          : `Shipday had ${body.found} order${body.found === 1 ? "" : "s"} (${body.active} still in flight): ${body.written} written, ${body.skipped} already up to date.`,
      );
      await load();
    } catch (err) {
      setPullNote(err instanceof Error ? err.message : "Could not reach Shipday.");
    } finally {
      setPulling(false);
    }
  }

  const handleLive = useCallback(({ delivery }: { delivery: Delivery }) => {
    if (!delivery?.id) return;
    setDeliveries((prev) => {
      const existing = prev.find((d) => d.id === delivery.id);
      const rest = prev.filter((d) => d.id !== delivery.id);
      /* The stream carries the raw row, which has no take.app match attached —
         keeping the one already resolved avoids the customer name blanking out
         every time a driver moves. */
      const merged = { ...delivery, takeapp: delivery.takeapp ?? existing?.takeapp ?? null };
      return [merged, ...rest];
    });
    setLastUpdated(new Date());

    setMovedIds((prev) => (prev.includes(delivery.id) ? prev : [...prev, delivery.id]));
    window.setTimeout(
      () => setMovedIds((prev) => prev.filter((id) => id !== delivery.id)),
      HIGHLIGHT_MS,
    );
  }, []);

  const handleRemoved = useCallback((id: string) => {
    setDeliveries((prev) => prev.filter((d) => d.id !== id));
  }, []);

  useEffect(() => { onLive.current = handleLive; }, [handleLive]);
  useEffect(() => { onRemoved.current = handleRemoved; }, [handleRemoved]);

  /* Opened once for the life of the screen — EventSource reconnects on its own
     after a drop or the platform's response cap, and filters are applied to
     what is already in state rather than re-subscribed. */
  useEffect(() => {
    const source = new EventSource("/api/admin/shipday/stream");

    source.addEventListener("ready", () => setConnection("live"));
    source.addEventListener("delivery", (e) => {
      try {
        onLive.current(JSON.parse((e as MessageEvent).data));
      } catch { /* a malformed frame must not take the stream down */ }
    });
    source.addEventListener("removed", (e) => {
      try {
        onRemoved.current((JSON.parse((e as MessageEvent).data) as { id: string }).id);
      } catch { /* same as above */ }
    });
    source.onopen = () => setConnection("live");
    source.onerror = () => setConnection((prev) => (prev === "live" ? "offline" : "connecting"));

    return () => source.close();
  }, []);

  /* Newest first by when the order was placed, falling back to when we heard
     about it — the same order the API sends, reapplied because the stream
     prepends. */
  const sorted = useMemo(
    () => [...deliveries].sort((a, b) =>
      String(b.placement_time ?? b.received_at).localeCompare(String(a.placement_time ?? a.received_at)),
    ),
    [deliveries],
  );

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return sorted.filter((d) => {
      if (status && d.order_status !== status) return false;
      if (needle) {
        const haystack = [
          d.order_number, d.id, d.carrier_name, d.carrier_phone,
          d.takeapp?.customer, d.takeapp?.phone, d.delivery_details?.name,
          d.delivery_details?.address,
        ].join(" ").toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [sorted, status, search]);

  const counts = useMemo(() => {
    const tally: Record<string, number> = {};
    shown.forEach((d) => { tally[d.order_status] = (tally[d.order_status] ?? 0) + 1; });
    return tally;
  }, [shown]);

  /* The roster endpoint reports availability as `isOnShift`, not the webhook's
     `status: "ONLINE"` — reading only the latter counts every driver offline. */
  const onShift = carriers.filter(carrierIsOnline).length;

  return (
    <div className="p-4 sm:p-8">
      {/* Heading, live pill and the status tally */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Shipday</p>
          <h1 className="text-2xl font-semibold text-gray-900">Shipday Delivery</h1>
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
            {shown.length} deliver{shown.length !== 1 ? "ies" : "y"}
            {lastUpdated && <span className="text-gray-400">· updated {stampTime(lastUpdated)}</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-4 py-2 h-11">
            {TALLY.map(({ status: s, dot }) => (
              <span key={s} className="flex items-center gap-1.5" title={statusLook(s).label}>
                <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                <span className="text-[13px] font-bold text-gray-700">{counts[s] ?? 0}</span>
              </span>
            ))}
          </div>

          <button
            onClick={() => { setRosterOpen((v) => !v); loadCarriers(); }}
            className={`flex items-center justify-center gap-2 px-4 h-11 rounded-lg text-sm font-semibold border transition flex-1 sm:flex-none ${
              rosterOpen ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Users size={14} /> Drivers{carriers.length > 0 ? ` · ${onShift}/${carriers.length}` : ""}
          </button>

          <button
            onClick={pullFromShipday}
            disabled={pulling}
            className="flex items-center justify-center gap-2 px-4 h-11 rounded-lg text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition flex-1 sm:flex-none disabled:opacity-60"
          >
            <DownloadCloud size={14} className={pulling ? "animate-pulse" : ""} />
            {pulling ? "Pulling…" : "Pull from Shipday"}
          </button>

          <button
            onClick={() => load()}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 h-11 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition flex-1 sm:flex-none disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Deliveries could not be loaded</p>
            <p className="text-red-600/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {pullNote && (
        <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>{pullNote}</p>
        </div>
      )}

      {!configured && (
        <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Shipday is not connected yet</p>
            <p className="text-amber-700/90 mt-0.5">
              Set <code className="font-mono text-[12px]">SHIPDAY_WEBHOOK_TOKEN</code>, then point Shipday
              (Dispatch → Settings → API &amp; Webhooks) at <code className="font-mono text-[12px]">/webhooks/shipday</code>.
            </p>
          </div>
        </div>
      )}

      {/* The driver roster. Read live from Shipday, so it is the one panel that
          needs the API key — its absence is stated here and nowhere else. */}
      {rosterOpen && (
        <div className="mb-4 bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Drivers on the account</p>
          {carrierError ? (
            <p className="text-sm text-gray-500 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" /> {carrierError}
            </p>
          ) : carriers.length === 0 ? (
            <p className="text-sm text-gray-400">No drivers on the account yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {carriers.map((c, i) => {
                const online = carrierIsOnline(c);
                const phone = c.phoneNumber || c.phone || "";
                return (
                  <div key={c.id ?? i} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${online ? "bg-green-500" : "bg-gray-300"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{c.name || "Unnamed driver"}</p>
                      <p className="text-[12px] text-gray-500 truncate">{phone || c.email || "—"}</p>
                    </div>
                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 shrink-0"
                        aria-label={`Call ${c.name || "the driver"}`}
                      >
                        <Phone size={14} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 px-3 sm:px-4 py-3 mb-4 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 px-3 h-11 rounded-lg border border-gray-200 flex-1 min-w-[180px] sm:flex-none">
          <Truck size={14} className="text-gray-400 shrink-0" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm bg-transparent focus:outline-none w-full sm:w-auto">
            <option value="">All statuses</option>
            {Object.keys(STATUS_LOOK).map((s) => (
              <option key={s} value={s}>{statusLook(s).label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 px-3 h-11 rounded-lg border border-gray-200 w-full sm:flex-1 sm:w-auto sm:min-w-[200px]">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order number, driver, customer or address"
            className="text-sm bg-transparent focus:outline-none w-full"
          />
        </label>

        {(status || search) && (
          <button
            onClick={() => { setStatus(""); setSearch(""); }}
            className={`${selectCls} h-11 font-semibold text-gray-600 hover:bg-gray-50`}
          >
            Clear
          </button>
        )}
      </div>

      {/* Phone view — one card per delivery, tap to open the detail */}
      <div className="sm:hidden space-y-2.5">
        {loading && shown.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400 text-sm">Loading deliveries…</div>
        ) : shown.length === 0 ? (
          <EmptyState error={error} configured={configured} />
        ) : shown.map((d) => {
          const look = statusLook(d.order_status);
          const open = expandedId === d.id;
          return (
            <div
              key={d.id}
              onClick={() => setExpandedId(open ? null : d.id)}
              className={`bg-white rounded-xl border p-3.5 transition ${
                movedIds.includes(d.id) ? "border-orange-400 ring-2 ring-orange-300" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-extrabold text-gray-900 leading-tight">#{d.order_number || d.id}</p>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <Clock size={10} className="shrink-0" />
                    <span className="whitespace-nowrap">{clockTime(d.placement_time)} · {sinceLabel(d.event_at ?? d.placement_time)}</span>
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide shrink-0 ${look.chip}`}>
                  {look.label}
                </span>
              </div>

              <div className="mt-2.5 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800 truncate flex items-center gap-1.5">
                    <Bike size={12} className="text-gray-400 shrink-0" />
                    {d.carrier_name || "No driver yet"}
                  </p>
                  <p className="text-[12px] text-gray-500 truncate">
                    {d.takeapp?.customer || d.delivery_details?.name || "—"}
                  </p>
                </div>
                <p className="text-base font-extrabold text-gray-900 whitespace-nowrap shrink-0">{money(d.total_cost)}</p>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <ProgressRail step={look.step} />
                <div className="flex items-center gap-2 shrink-0">
                  {d.carrier_phone && (
                    <a
                      href={`tel:${d.carrier_phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 active:bg-gray-100"
                      aria-label={`Call ${d.carrier_name || "the driver"}`}
                    >
                      <Phone size={14} />
                    </a>
                  )}
                  <ChevronDown size={16} className={`text-gray-300 transition-transform ${open ? "rotate-180" : ""}`} />
                </div>
              </div>

              {open && <DeliveryDetail d={d} />}
            </div>
          );
        })}
      </div>

      {/* Desktop table. A phone gets cards above: these columns cannot be read
          at 390px, and a sideways-scrolling table hides the driver — the one
          thing anyone opens this screen for. */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Driver</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last update</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && shown.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">Loading deliveries…</td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={8} className="py-16"><EmptyState error={error} configured={configured} /></td></tr>
            ) : shown.map((d) => {
              const look = statusLook(d.order_status);
              const open = expandedId === d.id;
              return (
                <tr
                  key={d.id}
                  onClick={() => setExpandedId(open ? null : d.id)}
                  className={`border-b border-gray-100 last:border-0 cursor-pointer transition hover:bg-gray-50/70 ${
                    movedIds.includes(d.id) ? "bg-orange-50/60" : ""
                  }`}
                >
                  <td className="px-4 py-3 align-top">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide whitespace-nowrap ${look.chip}`}>
                      {look.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="font-bold text-gray-900">#{d.order_number || d.id}</p>
                    <p className="text-[11px] text-gray-400">{clockTime(d.placement_time)}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {d.carrier_name ? (
                      <>
                        <p className="font-semibold text-gray-800">{d.carrier_name}</p>
                        <p className="text-[11px] text-gray-400">{d.carrier_phone || d.carrier_vehicle || "—"}</p>
                      </>
                    ) : (
                      <span className="text-gray-400">Not assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="text-gray-700">{d.takeapp?.customer || d.delivery_details?.name || "—"}</p>
                    <p className="text-[11px] text-gray-400 truncate max-w-[220px]">
                      {d.delivery_details?.formatted_address || d.delivery_details?.address || ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top w-[130px]"><ProgressRail step={look.step} /></td>
                  <td className="px-4 py-3 align-top">
                    <p className="text-gray-700">{eventLabel(d.last_event)}</p>
                    <p className="text-[11px] text-gray-400">{sinceLabel(d.event_at)}</p>
                  </td>
                  <td className="px-4 py-3 align-top text-right font-bold text-gray-900 whitespace-nowrap">
                    {money(d.total_cost)}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <ChevronDown size={16} className={`text-gray-300 transition-transform inline ${open ? "rotate-180" : ""}`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* The open row's detail sits under the table rather than inside it: a
            colSpan cell cannot hold this layout without fighting the columns. */}
        {expandedId && shown.some((d) => d.id === expandedId) && (
          <div className="border-t border-gray-200 bg-gray-50/60 px-4 py-4">
            <DeliveryDetail d={shown.find((d) => d.id === expandedId)!} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

function EmptyState({ error, configured }: { error: string; configured: boolean }) {
  return (
    <div className="py-8 text-center">
      <Truck size={28} className="mx-auto text-gray-300 mb-2" />
      <p className="text-gray-400 text-sm">
        {error
          ? "Nothing to show while the feed is failing."
          : !configured
            ? "Nothing yet — Shipday has not been pointed at this site."
            : "No deliveries yet. They appear here the moment Shipday reports one."}
      </p>
    </div>
  );
}

/**
 * The four steps of a delivery as a rail.
 *
 * A failed or incomplete delivery comes through as step -1 and colours the
 * whole rail red: it did not stop partway, it went wrong.
 */
function ProgressRail({ step }: { step: number }) {
  const failed = step < 0;
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className={`h-1.5 flex-1 min-w-[16px] rounded-full ${
            failed ? "bg-red-300" : n <= step ? "bg-orange-400" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="text-gray-400 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-[13px] text-gray-700 break-words">{value}</p>
      </div>
    </div>
  );
}

/** Everything Shipday knows about one delivery, opened from a row. */
function DeliveryDetail({ d }: { d: Delivery }) {
  const steps = timeline(d);
  const pods = Array.isArray(d.pod_urls) ? d.pod_urls : [];

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 lg:grid-cols-3 gap-4 text-left">
      {/* Driver */}
      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Driver</p>
        {d.carrier_name ? (
          <>
            <Field icon={User} label="Name" value={d.carrier_name} />
            {/* Only set when an outside fleet has it, so its presence is the
                answer to "why is this driver not one of ours". */}
            <Field icon={Truck} label="Fleet" value={d.third_party_name} />
            <Field icon={Phone} label="Phone" value={d.carrier_phone} />
            <Field icon={Bike} label="Vehicle" value={[d.carrier_vehicle, d.carrier_plate_number].filter(Boolean).join(" · ")} />
            <Field icon={Wifi} label="Driver status" value={d.carrier_status} />
            {d.carrier_phone && (
              <a
                href={`tel:${d.carrier_phone}`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Phone size={13} /> Call {d.carrier_name.split(" ")[0]}
              </a>
            )}
          </>
        ) : (
          <p className="text-[13px] text-gray-400">
            No driver assigned yet. Shipday will report one the moment it happens.
          </p>
        )}
      </div>

      {/* Route */}
      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Route</p>
        <Field icon={MapPin} label="Pickup" value={placeLabel(d.pickup_details)} />
        <Field icon={MapPin} label="Drop-off" value={placeLabel(d.delivery_details)} />
        <Field icon={Phone} label="Customer" value={d.takeapp?.phone || d.delivery_details?.phone || ""} />
        <Field
          icon={Navigation}
          label="Distance"
          value={[distanceLabel(d.driving_distance), durationLabel(d.driving_duration)].filter(Boolean).join(" · ")}
        />
        {/* Shipday's own expected time first, its live ETA second — both are
            timestamps, so neither is shown raw. */}
        <Field
          icon={Clock}
          label="Expected delivery"
          value={d.expected_delivery_time || d.eta ? clockTime(d.expected_delivery_time ?? d.eta) : ""}
        />
        <Field icon={StickyNote} label="Delivery note" value={d.delivery_note} />
        <Field
          icon={CreditCard}
          label="Charges"
          value={[
            `Total ${money(d.total_cost)}`,
            d.delivery_fee ? `fee ${money(d.delivery_fee)}` : "",
            d.tip ? `tip ${money(d.tip)}` : "",
            d.payment_method,
          ].filter(Boolean).join(" · ")}
        />
      </div>

      {/* Timeline */}
      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Timeline</p>
        {steps.length === 0 ? (
          <p className="text-[13px] text-gray-400">Nothing has happened yet.</p>
        ) : (
          <ol className="space-y-2">
            {steps.map(({ label, at, icon: Icon }) => (
              <li key={label} className="flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                  <Icon size={12} className="text-orange-500" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-700">{label}</p>
                  <p className="text-[11px] text-gray-400">{clockTime(at)} · {sinceLabel(at)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {pods.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Camera size={12} /> Proof of delivery
            </p>
            <div className="flex flex-wrap gap-2">
              {/* Signatures and doorstep photos are hosted by Shipday; opened in
                  a new tab rather than proxied through us. */}
              {pods.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Proof of delivery ${i + 1}`}
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        <p className="text-[11px] text-gray-400 pt-1">
          Shipday ID {d.id}
          {d.provider ? ` · via ${d.provider}` : ""}
        </p>
      </div>
    </div>
  );
}
