"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  CreditCard,
  Globe,
  MessageSquare,
  MonitorSmartphone,
  Printer,
  RefreshCw,
  ShoppingCart,
  Pencil,
  Timer,
  Undo2,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed } from "@/lib/pos/cart";
import type { OrderChannel } from "@/lib/order-source";
import type { PosStaff } from "@/lib/pos/constants";
import { can } from "@/lib/pos/permissions";
import { printDocument } from "@/lib/print-document";
import { useAlertChime } from "@/hooks/useAlertChime";
import EditOrderDialog from "@/components/pos/EditOrderDialog";
import { isPaid, needsKitchenApproval, type OrderLine } from "@/lib/pos/amend";
import PosShell from "@/components/pos/PosShell";
import StaleShiftWarning from "@/components/pos/StaleShiftWarning";
import type { StaleShift } from "@/lib/pos/shift";

/**
 * The board.
 *
 * Counter, kiosk and website orders on one list, because the kitchen does not
 * care where a burger was ordered and making staff watch three screens is how
 * one of them gets missed. Refreshes itself, since a board nobody is refreshing
 * is a board nobody trusts.
 */

export interface BoardOrder {
  id: string;
  source: OrderChannel;
  /** "Kiosk · UNIVERCITY TAB 1" — the panel or the cashier, when known. */
  source_label: string;
  /** Issued under that source's own prefix: POS-1124, TIO-1088, WEB-1122. */
  code: string;
  order_number: number | null;
  status: string;
  order_type: string | null;
  table_section: string | null;
  guest_name: string;
  phone: string;
  items: OrderLine[] | null;
  /** What has already been handed back on this order. */
  refunded_total?: number | string | null;
  /** '' | 'requested' | 'declined' — a cancellation waiting on the kitchen. */
  cancel_state?: string | null;
  total_amount: number | string | null;
  payment_method: string | null;
  created_at: string;
  /**
   * True for an order that came from one of the storefronts.
   *
   * It behaves differently in exactly two places, and both are on the card:
   * it was already paid on the site, and its printed invoice lives with
   * take.app rather than in our own invoice table. Everything else — the
   * items, the status chips, the kitchen filter — is the same board.
   */
  website?: boolean;
  /** The customer's own tracking page, for a website order. */
  tracking_url?: string;
  /** Whatever the customer typed in the storefront's notes box. */
  note?: string;
}

const STATUSES = [
  { value: "pending", label: "New", chip: "#FEF3C7", ink: "#92400E" },
  { value: "confirmed", label: "Preparing", chip: "#DBEAFE", ink: "#1D4ED8" },
  { value: "completed", label: "Done", chip: "#DCFCE7", ink: "#15803D" },
  { value: "cancelled", label: "Cancelled", chip: "#FEE2E2", ink: "#B91C1C" },
] as const;

/** What someone without the void permission can move an order to. */
const KITCHEN_STATUSES = STATUSES.filter((s) => s.value !== "cancelled");

const REFRESH_MS = 15_000;

/**
 * How long a ticket may sit before the clock on it turns red.
 *
 * Not a target the kitchen is being judged against — it is the point at which
 * a customer standing at the counter starts wondering, which is the moment
 * somebody should look at the ticket again. Green up to it, red past it, and
 * nothing in between: an amber middle would just mean everything is always
 * amber at lunch.
 */
const LATE_AFTER_MS = 15 * 60_000;

/** The three ways an order reaches the branch, in the order the chips read. */
const CHANNELS: OrderChannel[] = ["Counter", "Kiosk", "Website"];

function SourceIcon({ channel }: { channel: OrderChannel }) {
  if (channel === "Kiosk") return <MonitorSmartphone size={12} />;
  if (channel === "Website") return <Globe size={12} />;
  return <ShoppingCart size={12} />;
}

function money(v: unknown): string {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? aed(n) : "—";
}

/**
 * Minutes and seconds since the order came in, counting up.
 *
 * Driven by a `now` ticking in the parent rather than an interval of its own:
 * a busy board is thirty cards, and thirty timers each waking the browser once
 * a second on a café tablet is a measurable amount of the battery and a
 * noticeable amount of the scroll.
 *
 * Frozen once the ticket is finished. A completed order whose clock keeps
 * climbing reads as a problem that is still running.
 */
function Elapsed({ from, now, running }: { from: string; now: number; running: boolean }) {
  const started = new Date(from).getTime();
  const ms = Math.max(0, (running ? now : started) - started);
  const total = Math.floor(ms / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;

  const late = ms >= LATE_AFTER_MS;
  const tone = !running ? POS.inkSoft : late ? POS.bad : POS.good;

  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <Timer size={17} style={{ color: running ? POS.ink : POS.inkSoft }} />
      <span className="text-end leading-none">
        <span
          className="block text-[19px] font-black tabular-nums leading-none"
          style={{ color: tone }}
        >
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </span>
        <span className="block text-[9px] font-semibold mt-0.5" style={{ color: POS.inkSoft }}>
          min:sec
        </span>
      </span>
    </span>
  );
}

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function OrdersScreen({
  staff,
  kitchenOnly = false,
  stale = [],
}: {
  staff: PosStaff;
  /** The kitchen view: the same board, trimmed to what is being cooked. */
  kitchenOnly?: boolean;
  stale?: StaleShift[];
}) {
  const [orders, setOrders] = useState<BoardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  /** "" = all three. */
  const [source, setSource] = useState<"" | OrderChannel>("");
  const [paying, setPaying] = useState<BoardOrder | null>(null);
  const [editing, setEditing] = useState<BoardOrder | null>(null);
  const [amendBusy, setAmendBusy] = useState(false);
  const [amendError, setAmendError] = useState("");
  const [error, setError] = useState("");

  /* One second hand for every card on the board. Ticks only while somebody is
     looking, for the same reason the poll does: a tablet left on the kitchen
     board overnight should not be waking the browser 28,800 times before
     morning to redraw clocks nobody is reading. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!timer) timer = setInterval(() => setNow(Date.now()), 1000); };
    const stop = () => { if (timer) clearInterval(timer); timer = null; };
    const onVisibility = () => {
      if (document.hidden) stop();
      else { setNow(Date.now()); start(); }
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stop(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  /* Kitchen staff see the order; anyone who handles the money also sees what
     it is worth. Taken from the permissions rather than the role, so a
     supervisor who watches the board without working the till still sees the
     figures, and a cook granted the board still does not. */
  const showsMoney = can(staff, "till") || can(staff, "reports");
  /** Cancelling is a refund the drawer answers for, so it is its own grant. */
  const canVoid = can(staff, "void_order");

  /* The alert. Remembered per screen, so the board over the pass comes back
     with its sound on after a reboot rather than silently off. */
  const { soundOn, toggle: toggleSound, chime } = useAlertChime(
    kitchenOnly ? "tio-kitchen-alert" : "tio-orders-alert",
  );

  /* Every order this screen has already shown. The board polls rather than
     streams, so "new" is whatever was not in the last answer — and the very
     first answer is taken as the baseline, or opening the screen at lunch
     would fire thirty chimes at once for orders already half cooked. */
  const seenIds = useRef<Set<string>>(new Set());
  const seeded = useRef(false);

  /* Read through a ref rather than closed over. `load` is the dependency of
     both the first fetch and the polling interval, so taking soundOn as a
     dependency would tear the poll down and rebuild it — refetching the whole
     board — every time somebody pressed the speaker button. */
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  const load = useCallback(async () => {
    const res = await fetch("/api/pos/orders?scope=today", { cache: "no-store" });
    const body = await res.json().catch(() => null);

    if (body?.orders) {
      const rows = body.orders as BoardOrder[];

      /* Only what somebody still has to cook. A website order that arrived
         yesterday and is already marked done should not announce itself
         because the board happened to reload. */
      const waiting = rows.filter((o) => o.status === "pending" || o.status === "confirmed");
      const arrived = waiting.filter((o) => !seenIds.current.has(o.id));
      for (const o of rows) seenIds.current.add(o.id);

      /* One chime for a batch, not one per ticket. Three orders landing in the
         same fifteen-second poll is a busy minute, not three alarms. */
      if (seeded.current && arrived.length > 0 && soundRef.current) chime();
      seeded.current = true;

      setOrders(rows);
    }
    setLoading(false);
  }, [chime]);

  useEffect(() => { load(); }, [load]);

  /**
   * Polls only while somebody is looking.
   *
   * A tablet left on the orders board overnight was asking the database for the
   * day's orders four times a minute until morning, and a branch with three
   * screens open did it three times over. Hidden tabs stop, and a tab coming
   * back refreshes immediately rather than waiting out the interval.
   */
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(load, REFRESH_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else { load(); start(); }
    };

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  async function setStatus(id: string, status: string) {
    setError("");
    const previous = orders;
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status } : o)));
    const res = await fetch("/api/pos/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error || "Could not change that order.");
      setOrders(previous);
    }
  }

  /**
   * A kiosk order arrives unpaid — the customer pays when they collect. Doing
   * it here is what puts the money on the cashier's shift, so the day close
   * counts it and the drawer balances.
   */
  async function takePayment(order: BoardOrder, payment: string) {
    setError("");
    setPaying(null);
    const res = await fetch("/api/pos/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id, payment, status: "completed" }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error || "Could not record that payment.");
      return;
    }
    load();
  }

  /** Taking lines off an order, or asking the kitchen to. */
  async function amend(order: BoardOrder, input: {
    cancelIndexes: number[];
    cancelOrder: boolean;
    reason: string;
  }) {
    setAmendBusy(true);
    setAmendError("");
    const res = await fetch(`/api/pos/order/${encodeURIComponent(order.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => null);
    setAmendBusy(false);

    if (!res.ok) {
      setAmendError(body?.error || "That did not go through.");
      return;
    }
    setEditing(null);
    load();
  }

  /** The pass answering a cancellation the counter asked for. */
  async function decide(order: BoardOrder, decision: "accept" | "decline") {
    setError("");
    const res = await fetch(`/api/pos/order/${encodeURIComponent(order.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error || "Could not answer that cancellation.");
    }
    load();
  }

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) map[o.status] = (map[o.status] ?? 0) + 1;
    return map;
  }, [orders]);

  const shown = useMemo(() => {
    // The kitchen only wants what is not finished with.
    const base = kitchenOnly
      ? orders.filter((o) => o.status === "pending" || o.status === "confirmed")
      : orders;
    return base.filter(
      (o) => (!filter || o.status === filter) && (!source || o.source === source),
    );
  }, [orders, filter, source, kitchenOnly]);

  return (
    <PosShell
      staff={staff}
      title={kitchenOnly ? "Kitchen" : "Orders"}
      subtitle={
        kitchenOnly
          ? `${shown.length} being worked on · counter, kiosk and website`
          : `${orders.length} today · counter, kiosk and website`
      }
      warning={<StaleShiftWarning shifts={stale} />}
      actions={
        <>
        {/* Says what it will do, not what it is doing — "Alert off" on a
            kitchen screen reads as a fault rather than a setting. */}
        <button
          onClick={toggleSound}
          className="flex items-center gap-2 rounded-lg px-3.5 text-[13px] font-bold"
          style={
            soundOn
              ? { background: POS.goodSoft, color: POS.good, border: `1px solid ${POS.good}33`, height: 38 }
              : { border: `1px solid ${POS.line}`, color: POS.inkSoft, height: 38 }
          }
        >
          {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          {soundOn ? "Alert on" : "Alert off"}
        </button>

        <button
          onClick={() => { setLoading(true); load(); }}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-bold"
          style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
        </>
      }
    >
      <div className="pos-scroll h-full p-4">
        {!kitchenOnly && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="me-1 text-[12px] font-bold" style={{ color: POS.inkSoft }}>Where from</span>
            <Chip label={`All (${orders.length})`} active={source === ""} onClick={() => setSource("")} />
            {CHANNELS.map((channel) => (
              <Chip
                key={channel}
                label={`${channel} (${orders.filter((o) => o.source === channel).length})`}
                active={source === channel}
                onClick={() => setSource(channel)}
              />
            ))}
          </div>
        )}

        {!kitchenOnly && (
          <div className="mb-4 flex flex-wrap gap-2">
            <Chip label={`All (${orders.length})`} active={filter === ""} onClick={() => setFilter("")} />
            {STATUSES.map((s) => (
              <Chip
                key={s.value}
                label={`${s.label} (${counts[s.value] ?? 0})`}
                active={filter === s.value}
                onClick={() => setFilter(s.value)}
              />
            ))}
          </div>
        )}

        {error && (
          <p
            className="mb-3 rounded-lg px-4 py-2.5 text-sm font-semibold"
            style={{ background: POS.badSoft, color: POS.bad }}
          >
            {error}
          </p>
        )}

        {shown.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed py-16 text-center"
            style={{ borderColor: POS.line }}
          >
            <ShoppingCart size={26} className="mx-auto" style={{ color: "#C7CDD2" }} />
            <p className="mt-3 text-sm font-bold" style={{ color: POS.ink }}>
              {kitchenOnly ? "Nothing in the kitchen" : "No orders yet today"}
            </p>
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
          >
            {shown.map((order) => {
              const chip = STATUSES.find((s) => s.value === order.status);
              const items = Array.isArray(order.items) ? order.items : [];
              return (
                <div
                  key={order.id}
                  className="rounded-2xl bg-white p-4"
                  style={{ border: `1px solid ${POS.line}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-lg font-black leading-none" style={{ color: POS.ink }}>
                        {order.code}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[11.5px]" style={{ color: POS.inkSoft }}>
                        <SourceIcon channel={order.source} />
                        {order.source_label} · {order.order_type || "—"} · {ago(order.created_at)}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                      style={{ background: chip?.chip ?? POS.page, color: chip?.ink ?? POS.inkSoft }}
                    >
                      {chip?.label ?? order.status}
                    </span>
                  </div>

                  {/* Phone, then the panel and the clock on one line. A cook
                      reading this card wants two things at a glance: how long
                      it has been waiting, and which counter it goes back to. */}
                  {order.phone && showsMoney && (
                    <p className="mt-1.5 text-[12px] font-semibold" style={{ color: POS.inkSoft }}>
                      {order.phone}
                    </p>
                  )}

                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span
                      className="min-w-0 truncate text-[12px] font-bold uppercase tracking-wide"
                      style={{ color: POS.night }}
                    >
                      {order.table_section || " "}
                      {order.guest_name ? ` · ${order.guest_name}` : ""}
                    </span>
                    <Elapsed
                      from={order.created_at}
                      now={now}
                      /* Stops on a finished ticket. Nothing is waiting on a
                         cancelled order and nobody is late for a done one. */
                      running={order.status === "pending" || order.status === "confirmed"}
                    />
                  </div>

                  {/* ─── A cancellation the counter has asked for ─── */}
                  {/* The loudest thing on the card, because it is the only one
                      that stops the food. A dish that goes on being cooked
                      after the customer cancelled it is thrown away. */}
                  {order.cancel_state === "requested" && (
                    <div
                      className="mt-2.5 rounded-lg px-2.5 py-2"
                      style={{ background: POS.badSoft, border: `1px solid ${POS.bad}33` }}
                    >
                      <p className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: POS.bad }}>
                        <XCircle size={13} />
                        Cancellation requested
                      </p>
                      <p className="mt-0.5 text-[11.5px]" style={{ color: POS.bad }}>
                        {items.filter((i) => i.cancel_requested).length || "All"} item
                        {items.filter((i) => i.cancel_requested).length === 1 ? "" : "s"} — accept
                        only if it has not been made.
                      </p>
                      <div className="mt-2 flex gap-1.5">
                        <button
                          onClick={() => decide(order, "accept")}
                          className="flex-1 rounded-lg py-1.5 text-[12px] font-bold text-white"
                          style={{ background: POS.bad }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => decide(order, "decline")}
                          className="flex-1 rounded-lg py-1.5 text-[12px] font-bold"
                          style={{ background: "#fff", color: POS.ink, border: `1px solid ${POS.line}` }}
                        >
                          Decline — already made
                        </button>
                      </div>
                    </div>
                  )}

                  {/* The kitchen said no, and the counter needs to know before
                      they tell the customer their money is coming back. */}
                  {order.cancel_state === "declined" && (
                    <p
                      className="mt-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-bold"
                      style={{ background: "#FFFBEB", color: "#92400E" }}
                    >
                      <XCircle size={13} />
                      Kitchen declined the cancellation — it was already made.
                    </p>
                  )}

                  {/* The customer's note for the whole ticket. On a website
                      order it is the only thing they could say to the kitchen,
                      so it is never tucked away. */}
                  {order.note && (
                    <p
                      className="mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold"
                      style={{ background: "#FFFBEB", color: "#92400E" }}
                      dir="auto"
                    >
                      <MessageSquare size={13} className="mt-0.5 shrink-0" />
                      <span>
                        <span className="font-bold">Order comment: </span>
                        {order.note}
                      </span>
                    </p>
                  )}

                  {items.length > 0 && (
                    <ul className="mt-2.5 space-y-1">
                      {items.map((item, i) => (
                        <li
                          key={i}
                          className="text-[13px]"
                          style={{
                            color: item.cancelled ? POS.inkSoft : POS.ink,
                            textDecoration: item.cancelled ? "line-through" : "none",
                          }}
                        >
                          <span className="font-bold">{item.qty ?? 1}×</span> {item.name || "Item"}
                          {item.cancel_requested && !item.cancelled && (
                            <span className="ms-1.5 text-[10.5px] font-bold" style={{ color: POS.bad }}>
                              CANCEL ASKED
                            </span>
                          )}
                          {item.extras && (
                            <span className="text-[11px]" style={{ color: POS.inkSoft }}> · {item.extras}</span>
                          )}
                          {/* Its own row under the dish, not appended to the
                              extras. An extra is something being paid for and
                              a comment is an instruction to whoever is cooking
                              — run together, one of them gets skimmed past. */}
                          {item.note && (
                            <span
                              className="mt-1 flex items-start gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-semibold"
                              style={{ background: "#FFFBEB", color: "#92400E" }}
                              dir="auto"
                            >
                              <MessageSquare size={12} className="mt-0.5 shrink-0" />
                              <span>
                                <span className="font-bold">Item comment: </span>
                                {item.note}
                              </span>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div
                    className="mt-2.5 flex items-baseline justify-between pt-2.5"
                    style={{ borderTop: `1px solid ${POS.line}` }}
                  >
                    {/* A cook is plating food, not taking payment. The total and
                        whether it is settled are noise on that screen. */}
                    <span className="text-base font-black" style={{ color: POS.ink }}>
                      {showsMoney ? money(order.total_amount) : ""}
                    </span>
                    {!showsMoney ? null : order.website ? (
                      /* No "take payment" on a website order. It was settled on
                         the storefront, it sits on nobody's shift, and money
                         rung up here would be cash in the drawer that no day
                         close could account for. */
                      <span className="text-[11.5px]" style={{ color: POS.inkSoft }}>
                        {order.payment_method === "online" ? "paid online" : "unpaid on the site"}
                      </span>
                    ) : order.payment_method === "pending" || !order.payment_method ? (
                      /* Unpaid is not a label here, it is the next thing to do. */
                      <button
                        onClick={() => setPaying(order)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold"
                        style={{ background: POS.action, color: "#fff" }}
                      >
                        <Banknote size={13} />
                        Take payment
                      </button>
                    ) : (
                      <span className="text-[11.5px] capitalize" style={{ color: POS.inkSoft }}>
                        paid · {order.payment_method}
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {(canVoid ? STATUSES : KITCHEN_STATUSES).map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setStatus(order.id, s.value)}
                        disabled={order.status === s.value}
                        className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold transition-colors"
                        style={
                          order.status === s.value
                            ? { background: POS.night, color: "#fff" }
                            : { background: POS.page, color: POS.inkSoft }
                        }
                      >
                        {s.label}
                      </button>
                    ))}
                    <span className="flex-1" />

                    {/* The tracking page, for the customer on the phone asking
                        where their website order has got to. Counter staff only:
                        it is an answer to a question, not part of cooking. */}
                    {showsMoney && order.website && order.tracking_url && (
                      <a
                        href={order.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold"
                        style={{ background: POS.page, color: POS.ink }}
                      >
                        <Globe size={13} />
                        Track
                      </a>
                    )}

                    {/* Not gated on money. Printing the ticket is how the
                        kitchen works — it goes on the rail above the pass — and
                        hiding it from the one account that needs it most was
                        exactly backwards. Encoded because a website order's id
                        carries a colon. */}
                    <button
                      onClick={() => printDocument(`/pos/invoice/${encodeURIComponent(order.id)}`)}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold"
                      style={{ background: POS.page, color: POS.ink }}
                    >
                      <Printer size={13} />
                      Print
                    </button>

                    {/* Editing a website order is not ours to do — it lives in
                        take.app's table and the storefront owns its money. */}
                    {showsMoney && !order.website && order.status !== "cancelled" && (
                      <button
                        onClick={() => { setAmendError(""); setEditing(order); }}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold"
                        style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
                      >
                        {isPaid(order.payment_method) ? <Undo2 size={13} /> : <Pencil size={13} />}
                        {isPaid(order.payment_method) ? "Refund" : "Edit"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {editing && (
        <EditOrderDialog
          code={editing.code}
          items={Array.isArray(editing.items) ? editing.items : []}
          paymentMethod={editing.payment_method}
          refundedTotal={Number(editing.refunded_total) || 0}
          needsKitchen={needsKitchenApproval(editing.status)}
          busy={amendBusy}
          error={amendError}
          onCancel={() => setEditing(null)}
          onConfirm={(input) => amend(editing, input)}
        />
      )}

      {/* ─── Taking the money for an unpaid order ─── */}
      {paying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-[380px] rounded-2xl bg-white p-6">
            <p className="text-center text-[13px] font-semibold" style={{ color: POS.inkSoft }}>
              {paying.code} · amount due
            </p>
            <p className="text-center text-4xl font-black" style={{ color: POS.ink }}>
              {money(paying.total_amount)}
            </p>
            <p className="mt-2 text-center text-[12px]" style={{ color: POS.inkSoft }}>
              This goes onto your shift, so it counts at day close.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {([
                ["cash", Banknote],
                ["card", CreditCard],
                ["online", Globe],
              ] as const).map(([method, Icon]) => (
                <button
                  key={method}
                  onClick={() => takePayment(paying, method)}
                  className="flex flex-col items-center gap-1.5 rounded-xl py-3 text-[13px] font-bold capitalize"
                  style={{ background: POS.page, color: POS.ink, border: `1px solid ${POS.line}` }}
                >
                  <Icon size={19} />
                  {method}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPaying(null)}
              className="mt-4 w-full rounded-xl text-sm font-bold"
              style={{ background: POS.page, color: POS.ink, height: 46 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </PosShell>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg px-3.5 py-2 text-[13px] font-bold transition-colors"
      style={{
        background: active ? POS.night : "#fff",
        color: active ? "#fff" : POS.inkSoft,
        border: `1px solid ${active ? POS.night : POS.line}`,
      }}
    >
      {label}
    </button>
  );
}
