"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, MonitorSmartphone, Receipt, RefreshCw } from "lucide-react";
import { kioskOrderCode } from "@/lib/kiosk/types";

/**
 * admin → Kiosk → Orders.
 *
 * The orders the standing screen took, on their own board. They are ordinary
 * bookings underneath — the same rows Order History and the live board show —
 * so a status set here is set everywhere, and the tax invoice prints from the
 * same figures.
 *
 * What this board adds over the general one is the number the customer is
 * actually holding, and the queue read the way the kitchen works it: what has
 * not been started, what is on, what is ready to hand over.
 */

interface KioskOrder {
  id: string;
  order_number: number | null;
  status: string;
  phone: string;
  guest_name: string;
  notes: string;
  items: { name?: string; qty?: number; extras?: string }[] | null;
  total_amount: number | string | null;
  discount_total: number | string | null;
  payment_method: string | null;
  receipt_channels?: string[] | null;
  created_at: string;
}

/** The kitchen's three, plus the way out for one that never got collected. */
const STATUSES = [
  { value: "pending", label: "New", chip: "bg-amber-100 text-amber-800" },
  { value: "confirmed", label: "Preparing", chip: "bg-blue-100 text-blue-700" },
  { value: "completed", label: "Collected", chip: "bg-green-100 text-green-700" },
  { value: "cancelled", label: "Cancelled", chip: "bg-red-100 text-red-600" },
] as const;

const REFRESH_MS = 20_000;

function money(value: unknown): string {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) && n > 0 ? `AED ${n.toFixed(2)}` : "—";
}

function when(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function KioskOrdersAdmin() {
  const [orders, setOrders] = useState<KioskOrder[]>([]);
  const [prefix, setPrefix] = useState("TIO");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/kiosk/orders", { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (body && Array.isArray(body.orders)) {
      setOrders(body.orders as KioskOrder[]);
      setPrefix(body.orderPrefix || "TIO");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* A kitchen board nobody is looking at is worth nothing, so it refreshes
     itself rather than waiting to be reloaded. */
  useEffect(() => {
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function setStatus(id: string, status: string) {
    setSaving(id);
    const previous = orders;
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) setOrders(previous);
    } catch {
      setOrders(previous);
    } finally {
      setSaving(null);
    }
  }

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) map[o.status] = (map[o.status] ?? 0) + 1;
    return map;
  }, [orders]);

  const shown = filter ? orders.filter((o) => o.status === filter) : orders;

  const takings = useMemo(
    () =>
      orders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + (parseFloat(String(o.total_amount ?? 0)) || 0), 0),
    [orders],
  );

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Self-Order Kiosk</p>
          <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {orders.length} order{orders.length === 1 ? "" : "s"} from the screen ·{" "}
            {money(takings)} excluding cancellations
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ─── Filter ─── */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setFilter("")}
          className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${filter === "" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          All ({orders.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${filter === s.value ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {s.label} ({counts[s.value] ?? 0})
          </button>
        ))}
      </div>

      {loading && orders.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-400">Loading...</p>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <MonitorSmartphone size={26} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-gray-700">
            {orders.length === 0 ? "No kiosk orders yet" : "Nothing with that status"}
          </p>
          {orders.length === 0 && (
            <p className="mt-1 text-sm text-gray-500">
              Orders placed on the standing screen land here the moment they are sent.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {shown.map((order) => {
            const chip = STATUSES.find((s) => s.value === order.status);
            const items = Array.isArray(order.items) ? order.items : [];
            const discount = parseFloat(String(order.discount_total ?? 0)) || 0;
            return (
              <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-black text-gray-900 leading-none">
                      {kioskOrderCode(prefix, order.order_number)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {when(order.created_at)}
                      {order.phone ? ` · ${order.phone}` : " · no phone"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${chip?.chip ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {chip?.label ?? order.status}
                  </span>
                </div>

                {items.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {items.map((item, i) => (
                      <li key={i} className="text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">{item.qty ?? 1}×</span>{" "}
                        {item.name || "Item"}
                        {item.extras && <span className="text-xs text-gray-400"> · {item.extras}</span>}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex items-baseline justify-between border-t border-gray-100 pt-3">
                  <span className="text-lg font-black text-gray-900">{money(order.total_amount)}</span>
                  <span className="text-xs text-gray-500">
                    {discount > 0 && <span className="text-green-600 font-semibold">saved {money(discount)} · </span>}
                    {order.payment_method === "pending" || !order.payment_method
                      ? "unpaid"
                      : order.payment_method}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setStatus(order.id, s.value)}
                      disabled={saving === order.id || order.status === s.value}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-100 ${
                        order.status === s.value
                          ? "bg-gray-900 text-white"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <Link
                    href={`/admin/invoice/${order.id}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Receipt size={13} />
                    Invoice
                  </Link>
                  <a
                    href={`/order/${order.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <ExternalLink size={13} />
                    Customer view
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
