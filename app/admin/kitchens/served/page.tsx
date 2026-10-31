"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Printer } from "lucide-react";
import { printDocument } from "@/lib/print-document";
import { orderTimeline, type OrderEvent, type OrderItem } from "@/lib/kitchen-orders";
import { money, when } from "../OrderMoneyCard";
import AddItemsDialog from "./AddItemsDialog";

interface ServedOrder {
  id: string;
  order_number: number;
  table_code: string | null;
  guests: number;
  waiter_name: string | null;
  items: OrderItem[];
  total: number | string;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  paid_amount?: number | string | null;
  ready_at?: string | null;
  served_at?: string | null;
  round?: number | null;
  events?: OrderEvent[] | null;
  created_at: string;
}

const REFRESH_MS = 15_000;

function paymentText(o: ServedOrder): { label: string; cls: string } {
  if (o.paid_at) {
    const method = o.payment_method === "card" ? " · Card" : o.payment_method === "cash" ? " · Cash" : "";
    return { label: `Paid${method}`, cls: "bg-green-100 text-green-700" };
  }
  if (o.payment_method === "credit") return { label: "On credit", cls: "bg-amber-100 text-amber-800" };
  const already = Number(o.paid_amount ?? 0);
  return already > 0
    ? { label: `Balance ${money(Number(o.total) - already)}`, cls: "bg-red-100 text-red-700" }
    : { label: "Not paid", cls: "bg-red-100 text-red-700" };
}

export default function KitchenServedOrders() {
  const [orders, setOrders] = useState<ServedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<ServedOrder | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/kitchens/served").catch(() => null);
    const data = await res?.json().catch(() => null);
    setLoading(false);
    if (!res?.ok || !Array.isArray(data)) {
      setLoadError(data?.error ?? "Could not load the served orders.");
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

  const q = search.trim().toLowerCase().replace(/^#/, "");
  const visible = q
    ? orders.filter((o) =>
        String(o.order_number) === q ||
        (o.table_code ?? "").toLowerCase().includes(q) ||
        (o.waiter_name ?? "").toLowerCase().includes(q),
      )
    : orders;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Kitchens Page</p>
          <h1 className="text-2xl font-semibold text-gray-900">Served Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orders.length} served · add more items to send an order back to the kitchen</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Order, table or waiter"
          aria-label="Search served orders"
          className="w-full sm:w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {notice && <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">{notice}</p>}
      {loadError && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>}

      {loading ? (
        <p className="text-center py-16 text-gray-400 text-sm">Loading...</p>
      ) : visible.length === 0 ? (
        <p className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">{q ? "No served orders match." : "No served orders yet."}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((order) => {
            const pill = paymentText(order);
            const rounds = Array.from(new Set((order.items ?? []).map((i) => i.round ?? 1))).sort((a, b) => a - b);
            return (
              <article key={order.id} className="flex flex-col bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900">
                      #{order.order_number}{order.table_code ? ` · Table ${order.table_code}` : ""}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">{when(order.created_at)} · {order.guests} {order.guests === 1 ? "person" : "people"}</p>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{order.waiter_name ? `Waiter: ${order.waiter_name}` : "No waiter"}</p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${pill.cls}`}>{pill.label}</span>
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  {rounds.map((round) => (
                    <div key={round}>
                      {rounds.length > 1 && (
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{round === 1 ? "First order" : `Added items ${round - 1}`}</p>
                      )}
                      <ul className="space-y-1">
                        {(order.items ?? []).filter((i) => (i.round ?? 1) === round).map((item, i) => (
                          <li key={i} className="flex justify-between gap-3">
                            <span className="text-gray-800">
                              {item.qty} × {item.name}
                              {item.addons?.length ? <span className="block text-xs text-gray-500">{item.addons.map((a) => a.name).join(", ")}</span> : null}
                            </span>
                            <span className="shrink-0 text-gray-600">{money(Number(item.line_total))}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-sm font-semibold text-gray-600">Total</span>
                  <span className="text-base font-bold text-gray-900">{money(Number(order.total))}</span>
                </div>

                <div className="mt-3 flex-1">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Order history</p>
                  <ol className="space-y-1.5 border-s-2 border-gray-200 ps-3">
                    {orderTimeline(order).map((entry, i) => (
                      <li key={i} className="flex justify-between gap-3 text-xs">
                        <span className="font-medium text-gray-700">{entry.label}</span>
                        <span className="shrink-0 text-gray-500">{when(entry.at)}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => printDocument(`/admin/kitchens/receipt/${order.id}`)}
                    aria-label={`Print order ${order.order_number}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Printer size={14} />
                    Print
                  </button>
                  <button
                    onClick={() => { setNotice(""); setAdding(order); }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white"
                    style={{ background: "#ea580c" }}
                  >
                    <Plus size={15} />
                    Add items
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {adding && (
        <AddItemsDialog
          orderId={adding.id}
          orderLabel={`order #${adding.order_number}`}
          onClose={() => setAdding(null)}
          onSent={() => {
            setNotice(`Order #${adding.order_number} went back to the kitchen with the new items.`);
            setAdding(null);
            load();
          }}
        />
      )}
    </div>
  );
}
