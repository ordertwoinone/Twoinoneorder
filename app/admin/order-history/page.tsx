"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Printer, Banknote, CreditCard, Download } from "lucide-react";

const filterCls =
  "px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400";

/**
 * admin → Order History.
 *
 * Every order ever placed, oldest at the bottom, with the two things the live
 * board deliberately leaves out: the number a customer quotes, and how the
 * order was actually settled.
 *
 * Payment method is set here rather than captured at checkout because the
 * website cannot know — the money changes hands at the counter or the door,
 * after the order was placed. Staff mark it once they have taken it.
 */

interface Booking {
  id: string;
  order_number?: number | null;
  type: string;
  order_type?: string | null;
  guest_name: string;
  phone: string;
  table_id: string;
  table_section: string;
  notes: string;
  status: string;
  created_at: string;
  total_amount?: number | string | null;
  payment_method?: string | null;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
] as const;

const TYPE_CHIPS: Record<string, string> = {
  table: "bg-orange-100 text-orange-700",
  buffet: "bg-amber-100 text-amber-700",
  catering: "bg-purple-100 text-purple-700",
  kalba: "bg-green-100 text-green-700",
};

const STATUS_CHIPS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

/** The same four the live board offers, so one order reads alike on both. */
const STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;

function money(value: unknown): string {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) && n > 0 ? `AED ${n.toFixed(2)}` : "—";
}

function when(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function OrderHistoryAdmin() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  /* payment_method arrives with a hand-run migration. Without it the dropdown
     would appear to work and save nowhere, so say so instead. */
  const [ready, setReady] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/bookings", { cache: "no-store" });
    const data = await res.json().catch(() => []);
    const list: Booking[] = Array.isArray(data) ? data : [];
    setRows(list);
    setReady(list.length === 0 || "payment_method" in list[0]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /**
   * Saves one field of one order, optimistically.
   *
   * The row moves first so the dropdown feels immediate, and moves back if the
   * write is refused — a control that stays where it was put while the database
   * disagrees is the worst of both.
   */
  async function patchOrder(id: string, patch: Partial<Booking>) {
    setSaving(id);
    const previous = rows;
    setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));

    const [field, expected] = Object.entries(patch)[0] ?? [];

    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const saved = await res.json().catch(() => null);

      if (!res.ok) {
        setRows(previous);
        return;
      }
      /* A row that comes back without the field means the column is not there
         and the write shed it — the migration has not been run. */
      if (saved && field && saved[field] !== expected) {
        setRows(previous);
        if (field === "payment_method") setReady(false);
      }
    } catch {
      setRows(previous);
    } finally {
      setSaving(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    /* Whole days, in the operator's own timezone: someone asking for the 14th
       means every order that day, not from midnight UTC. */
    const floor = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const cutoff = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;

    return rows.filter((r) => {
      const placed = new Date(r.created_at).getTime();
      if (floor && (!Number.isFinite(placed) || placed < floor)) return false;
      if (cutoff && placed > cutoff) return false;
      if (status && (r.status || "pending") !== status) return false;
      if (payment && (r.payment_method ?? "cash").toLowerCase() !== payment) return false;
      if (!q) return true;
      return [r.order_number, r.guest_name, r.phone, r.table_id, r.notes, r.type]
        .map((v) => String(v ?? "").toLowerCase())
        .some((v) => v.includes(q));
    });
  }, [rows, query, fromDate, toDate, status, payment]);

  /** The takings for what is on screen — the reason to filter by date at all. */
  const takings = useMemo(
    () =>
      filtered.reduce((sum, r) => {
        const n = typeof r.total_amount === "number" ? r.total_amount : parseFloat(String(r.total_amount ?? ""));
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [filtered],
  );

  /* The report is what is on screen, filters and all — downloading something
     other than what you are looking at would be a surprise. */
  function downloadReport() {
    const header = [
      "Order", "Placed", "Type", "Fulfilment", "Customer", "Phone",
      "Total", "Payment", "Status", "Note",
    ];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = filtered.map((r) =>
      [
        r.order_number ?? r.id.slice(0, 8),
        r.created_at,
        r.type,
        r.order_type ?? "",
        r.guest_name,
        r.phone,
        (() => {
          const n = typeof r.total_amount === "number" ? r.total_amount : parseFloat(String(r.total_amount ?? ""));
          return Number.isFinite(n) && n > 0 ? n.toFixed(2) : "";
        })(),
        (r.payment_method ?? "cash").toLowerCase(),
        r.status || "pending",
        r.notes,
      ].map(escape).join(","),
    );

    const blob = new Blob([[header.map(escape).join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // Named for the range it covers, not the day it was downloaded.
    const span = fromDate || toDate ? `${fromDate || "start"}_to_${toDate || "today"}` : "all";
    link.download = `order-history-${span}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Orders</p>
          <h1 className="text-2xl font-semibold text-gray-900">Order History</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading…" : `${filtered.length} order${filtered.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Number, name, phone…"
              className="w-56 pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={downloadReport}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "#ea580c" }}
          >
            <Download size={14} />
            Download report
          </button>
        </div>
      </div>

      {/* Filters. Dates are whole days in the operator's own timezone. */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 mb-5 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-700">From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={filterCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-700">To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={filterCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-700">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={filterCls}>
            <option value="">Any</option>
            {STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-700">Payment</span>
          <select value={payment} onChange={(e) => setPayment(e.target.value)} className={filterCls}>
            <option value="">Any</option>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <button
          onClick={() => { setFromDate(""); setToDate(""); setStatus(""); setPayment(""); setQuery(""); }}
          className="px-4 py-2.5 rounded-lg bg-gray-100 text-sm font-semibold text-gray-600 hover:bg-gray-200"
        >
          Clear
        </button>
        {takings > 0 && (
          <p className="ms-auto text-sm text-gray-500">
            Takings shown:{" "}
            <span className="font-extrabold text-gray-900">AED {takings.toFixed(2)}</span>
          </p>
        )}
      </div>

      {!ready && (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-5">
          Run <code className="font-mono">supabase/order_invoices.sql</code> in the Supabase SQL
          editor — until then there is no payment method column to save into, and orders have no
          number to print on an invoice.
        </p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              {["Order", "Placed", "Customer", "Type", "Total", "Payment", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">Loading orders…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">No orders yet.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                    {r.order_number != null ? `#${r.order_number}` : r.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{when(r.created_at)}</td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-gray-800 truncate">{r.guest_name || "—"}</p>
                    {r.phone && <p className="text-xs text-gray-400 truncate" dir="ltr">{r.phone}</p>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${TYPE_CHIPS[r.type] ?? "bg-gray-100 text-gray-600"}`}>
                      {r.type || "order"}
                    </span>
                    {r.order_type && (
                      <span className="block text-[11px] text-gray-400 mt-0.5">{r.order_type}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                    {money(r.total_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={(r.payment_method ?? "cash").toLowerCase()}
                      disabled={saving === r.id}
                      onChange={(e) => patchOrder(r.id, { payment_method: e.target.value })}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {/* Keeps the chip's colour so the board still scans at a
                        glance, and changes it in place. */}
                    <select
                      value={r.status || "pending"}
                      disabled={saving === r.id}
                      onChange={(e) => patchOrder(r.id, { status: e.target.value })}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wide border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60 ${STATUS_CHIPS[r.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {STATUSES.map((v) => (
                        <option key={v} value={v} className="bg-white text-gray-800 font-normal text-sm normal-case">
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/admin/invoice/${r.id}?print=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Print invoice"
                      aria-label="Print invoice"
                      className="inline-flex w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                    >
                      <Printer size={14} />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-400 mt-3">
        Status and payment method save as soon as you change them. Payment is set here rather than
        at checkout — the money changes hands after the order is placed, so only staff know how it
        was settled. It prints on the invoice.
      </p>
    </div>
  );
}
