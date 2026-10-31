"use client";
import { useEffect, useRef, useState } from "react";
import { money, when } from "../OrderMoneyCard";
import type { KitchenOrderStatus, OrderItem } from "@/lib/kitchen-orders";

interface HistoryOrder {
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
  created_at: string;
}

const STATUS_STYLE: Record<KitchenOrderStatus, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-red-100 text-red-700" },
  preparing: { label: "Preparing", cls: "bg-amber-100 text-amber-800" },
  ready: { label: "Ready", cls: "bg-green-200 text-green-900" },
  served: { label: "Served", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-500" },
};

const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
const labelCls = "block text-xs font-semibold text-gray-700 mb-1";

function paymentLabel(order: HistoryOrder): string {
  if (order.status === "cancelled") return "—";
  if (order.paid_at) return order.payment_method === "card" ? "Card" : order.payment_method === "cash" ? "Cash" : "Paid";
  return order.payment_method === "credit" ? "On credit" : "Not paid";
}

export default function KitchenOrderHistoryAdmin() {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [sales, setSales] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  // Only the newest request may fill the table, however the replies arrive.
  const latest = useRef(0);

  // Waits for a pause in typing, so each letter isn't its own request.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const ticket = ++latest.current;
    const params = new URLSearchParams({ page: String(page) });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (status) params.set("status", status);
    if (payment) params.set("payment", payment);
    if (query) params.set("q", query);

    setLoading(true);
    fetch(`/api/admin/kitchens/history?${params}`)
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => null) }))
      .catch(() => ({ ok: false, data: null }))
      .then(({ ok, data }) => {
        if (ticket !== latest.current) return;
        setLoading(false);
        if (!ok || !Array.isArray(data?.orders)) {
          setLoadError(data?.error ?? "Could not load the order history.");
          return;
        }
        setLoadError("");
        setOrders(data.orders);
        setTotal(data.total);
        setSales(data.sales);
        setPageSize(data.pageSize);
      });
  }, [page, from, to, status, payment, query]);

  const change = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const filtered = Boolean(from || to || status || payment || search);

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Kitchens Page</p>
        <h1 className="text-2xl font-semibold text-gray-900">Order History</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {total} order{total !== 1 ? "s" : ""} · {money(sales)} excluding cancelled
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 md:grid-cols-5">
        <div>
          <label htmlFor="kh-from" className={labelCls}>From</label>
          <input id="kh-from" type="date" value={from} max={to || undefined} onChange={change(setFrom)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="kh-to" className={labelCls}>To</label>
          <input id="kh-to" type="date" value={to} min={from || undefined} onChange={change(setTo)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="kh-status" className={labelCls}>Status</label>
          <select id="kh-status" value={status} onChange={change(setStatus)} className={inputCls}>
            <option value="">All</option>
            {(Object.keys(STATUS_STYLE) as KitchenOrderStatus[]).map((s) => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="kh-payment" className={labelCls}>Payment</label>
          <select id="kh-payment" value={payment} onChange={change(setPayment)} className={inputCls}>
            <option value="">All</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="credit">On credit</option>
            <option value="unpaid">Not paid</option>
          </select>
        </div>
        <div className="col-span-2 md:col-span-1">
          <label htmlFor="kh-search" className={labelCls}>Search</label>
          <input id="kh-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order, table or waiter" className={inputCls} />
        </div>
      </div>

      {loadError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
          <span className="block text-xs mt-1 text-red-600">If something is missing, run supabase/kitchen_order_payments.sql and supabase/kitchen_order_credit.sql in the Supabase SQL editor.</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Table</th>
              <th className="px-4 py-3">Waiter</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
            </tr>
          </thead>
          <tbody>
            {loading && orders.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">{filtered ? "No orders match these filters." : "No orders yet."}</td></tr>
            ) : orders.map((order) => {
              const style = STATUS_STYLE[order.status];
              return (
                <tr key={order.id} className="border-b border-gray-100 align-top">
                  <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">#{order.order_number}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{when(order.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {order.table_code ?? "—"}<span className="block text-gray-400">{order.guests} {order.guests === 1 ? "person" : "people"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{order.waiter_name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-700 min-w-[220px]">
                    {(order.items ?? []).map((item, i) => (
                      <p key={i}>
                        {item.qty} × {item.name}
                        {item.addons?.length ? <span className="text-gray-500"> ({item.addons.map((a) => a.name).join(", ")})</span> : null}
                      </p>
                    ))}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{money(Number(order.total))}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${style.cls}`}>{style.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{paymentLabel(order)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {lastPage > 1 && (
        <div className="flex items-center justify-between gap-3 mt-4">
          <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Previous</button>
          <span className="text-xs text-gray-500">Page {page} of {lastPage}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= lastPage} className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
