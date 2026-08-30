"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, Globe, MonitorSmartphone, Printer, RefreshCw, ShoppingCart } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed, posOrderCode } from "@/lib/pos/cart";
import type { PosStaff } from "@/lib/pos/constants";
import PosShell from "@/components/pos/PosShell";

/**
 * The board.
 *
 * Till orders and kiosk orders on one list, because the kitchen does not care
 * where a burger was ordered and making staff watch two screens is how the
 * kiosk order gets missed. Refreshes itself, since a board nobody is refreshing
 * is a board nobody trusts.
 */

export interface BoardOrder {
  id: string;
  source: "Till" | "Kiosk";
  order_number: number | null;
  status: string;
  order_type: string | null;
  table_section: string | null;
  guest_name: string;
  phone: string;
  items: { name?: string; qty?: number; extras?: string }[] | null;
  total_amount: number | string | null;
  payment_method: string | null;
  created_at: string;
}

const STATUSES = [
  { value: "pending", label: "New", chip: "#FEF3C7", ink: "#92400E" },
  { value: "confirmed", label: "Preparing", chip: "#DBEAFE", ink: "#1D4ED8" },
  { value: "completed", label: "Done", chip: "#DCFCE7", ink: "#15803D" },
  { value: "cancelled", label: "Cancelled", chip: "#FEE2E2", ink: "#B91C1C" },
] as const;

const REFRESH_MS = 15_000;

function money(v: unknown): string {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? aed(n) : "—";
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
}: {
  staff: PosStaff;
  /** The kitchen view: the same board, trimmed to what is being cooked. */
  kitchenOnly?: boolean;
}) {
  const [orders, setOrders] = useState<BoardOrder[]>([]);
  const [prefix, setPrefix] = useState("ORD");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  /** "" = both, or "Till" / "Kiosk". */
  const [source, setSource] = useState<"" | "Till" | "Kiosk">("");
  const [paying, setPaying] = useState<BoardOrder | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/pos/orders?scope=today", { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (body?.orders) {
      setOrders(body.orders as BoardOrder[]);
      setPrefix(body.orderPrefix || "ORD");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
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
          ? `${shown.length} being worked on · till and kiosk together`
          : `${orders.length} today · till and kiosk together`
      }
      actions={
        <button
          onClick={() => { setLoading(true); load(); }}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-bold"
          style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      }
    >
      <div className="pos-scroll h-full p-4">
        {!kitchenOnly && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="me-1 text-[12px] font-bold" style={{ color: POS.inkSoft }}>Where from</span>
            <Chip label={`Both (${orders.length})`} active={source === ""} onClick={() => setSource("")} />
            <Chip
              label={`Till (${orders.filter((o) => o.source === "Till").length})`}
              active={source === "Till"}
              onClick={() => setSource("Till")}
            />
            <Chip
              label={`Kiosk (${orders.filter((o) => o.source === "Kiosk").length})`}
              active={source === "Kiosk"}
              onClick={() => setSource("Kiosk")}
            />
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
                        {posOrderCode(prefix, order.order_number)}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[11.5px]" style={{ color: POS.inkSoft }}>
                        {order.source === "Kiosk" ? <MonitorSmartphone size={12} /> : <ShoppingCart size={12} />}
                        {order.source} · {order.order_type || "—"} · {ago(order.created_at)}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                      style={{ background: chip?.chip ?? POS.page, color: chip?.ink ?? POS.inkSoft }}
                    >
                      {chip?.label ?? order.status}
                    </span>
                  </div>

                  {order.table_section && (
                    <p className="mt-1.5 text-[12px] font-semibold" style={{ color: POS.inkSoft }}>
                      {order.table_section}
                      {order.guest_name ? ` · ${order.guest_name}` : ""}
                    </p>
                  )}

                  {items.length > 0 && (
                    <ul className="mt-2.5 space-y-1">
                      {items.map((item, i) => (
                        <li key={i} className="text-[13px]" style={{ color: POS.ink }}>
                          <span className="font-bold">{item.qty ?? 1}×</span> {item.name || "Item"}
                          {item.extras && (
                            <span className="text-[11px]" style={{ color: POS.inkSoft }}> · {item.extras}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div
                    className="mt-2.5 flex items-baseline justify-between pt-2.5"
                    style={{ borderTop: `1px solid ${POS.line}` }}
                  >
                    <span className="text-base font-black" style={{ color: POS.ink }}>
                      {money(order.total_amount)}
                    </span>
                    {order.payment_method === "pending" || !order.payment_method ? (
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
                    {STATUSES.map((s) => (
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
                    <button
                      onClick={() => window.open(`/pos/invoice/${order.id}?print=1`, "_blank")}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold"
                      style={{ background: POS.page, color: POS.ink }}
                    >
                      <Printer size={13} />
                      Print
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* ─── Taking the money for an unpaid order ─── */}
      {paying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-[380px] rounded-2xl bg-white p-6">
            <p className="text-center text-[13px] font-semibold" style={{ color: POS.inkSoft }}>
              {posOrderCode(prefix, paying.order_number)} · amount due
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
