"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, MonitorSmartphone, Printer, Search, ShoppingCart, Trash2 } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed } from "@/lib/pos/cart";
import type { PosStaff } from "@/lib/pos/constants";
import type { OrderChannel } from "@/lib/order-source";
import { printDocument } from "@/lib/print-document";
import PosShell from "@/components/pos/PosShell";

/**
 * Order history: everything the branch has taken, not just today.
 *
 * The board deliberately shows one day — it is a working screen for food being
 * cooked, and a month of finished tickets on it would bury the four that
 * matter. This answers the other question, "what happened on the twelfth", and
 * so it has a date range, a search box and pages instead of big status buttons.
 */

interface Row {
  id: string;
  code: string;
  source: OrderChannel;
  source_label: string;
  status: string;
  order_type: string | null;
  table_section: string | null;
  guest_name: string;
  phone: string;
  items: { name?: string; qty?: number }[] | null;
  total_amount: number | string | null;
  refunded_total: number | string | null;
  payment_method: string | null;
  created_at: string;
}

const STATUS_CHIP: Record<string, { label: string; chip: string; ink: string }> = {
  pending: { label: "New", chip: "#FEF3C7", ink: "#92400E" },
  confirmed: { label: "Preparing", chip: "#DBEAFE", ink: "#1D4ED8" },
  completed: { label: "Done", chip: "#DCFCE7", ink: "#15803D" },
  picked_up: { label: "Picked up", chip: "#E0E7FF", ink: "#3730A3" },
  cancelled: { label: "Cancelled", chip: "#FEE2E2", ink: "#B91C1C" },
};

function money(v: unknown): string {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? aed(n) : "—";
}

function when(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

function SourceIcon({ channel }: { channel: OrderChannel }) {
  if (channel === "Kiosk") return <MonitorSmartphone size={12} />;
  if (channel === "Website") return <Globe size={12} />;
  return <ShoppingCart size={12} />;
}

export default function HistoryScreen({ staff }: { staff: PosStaff }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(40);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [confirm, setConfirm] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const url = `/api/pos/history?page=${page}&q=${encodeURIComponent(query)}&status=${status}&from=${from}&to=${to}`;
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (body?.orders) {
      setRows(body.orders as Row[]);
      setTotal(body.total ?? 0);
      setPageSize(body.pageSize ?? 40);
      setCanDelete(Boolean(body.canDelete));
    }
    setLoading(false);
  }, [page, query, status, from, to]);

  useEffect(() => { load(); }, [load]);
  /* Back to the first page whenever the filter changes, or a search returning
     one page leaves you looking at an empty page four. */
  useEffect(() => { setPage(0); }, [query, status, from, to]);

  async function remove() {
    if (!confirm) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/pos/history?id=${encodeURIComponent(confirm.id)}`, {
      method: "DELETE",
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(body?.error || "Could not delete that order.");
      return;
    }
    setConfirm(null);
    load();
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PosShell
      staff={staff}
      title="Order History"
      subtitle={`${total} order${total === 1 ? "" : "s"} · every day, not just today`}
    >
      <div className="pos-scroll h-full p-4">
        {/* ─── Narrowing it ─── */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label
            className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg bg-white px-3"
            style={{ border: `1px solid ${POS.line}`, height: 40 }}
          >
            <Search size={16} style={{ color: POS.inkSoft }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or phone"
              className="w-full bg-transparent text-[13.5px] focus:outline-none"
              style={{ color: POS.ink }}
            />
          </label>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg bg-white px-3 text-[13.5px] font-semibold focus:outline-none"
            style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 40 }}
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_CHIP).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>

          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg bg-white px-3 text-[13px] font-semibold focus:outline-none"
            style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 40 }}
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg bg-white px-3 text-[13px] font-semibold focus:outline-none"
            style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 40 }}
          />

          {(query || status || from || to) && (
            <button
              onClick={() => { setQuery(""); setStatus(""); setFrom(""); setTo(""); }}
              className="rounded-lg px-3 text-[13px] font-bold"
              style={{ border: `1px solid ${POS.line}`, color: POS.inkSoft, height: 40 }}
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <p
            className="mb-3 rounded-lg px-4 py-2.5 text-sm font-semibold"
            style={{ background: POS.badSoft, color: POS.bad }}
          >
            {error}
          </p>
        )}

        <div className="overflow-hidden rounded-2xl bg-white" style={{ border: `1px solid ${POS.line}` }}>
          <div
            className="grid gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide"
            style={{ gridTemplateColumns: COLUMNS, color: POS.inkSoft, borderBottom: `1px solid ${POS.line}` }}
          >
            <span>Order</span>
            <span>When</span>
            <span>Where from</span>
            <span>Customer</span>
            <span>Items</span>
            <span className="text-end">Total</span>
            <span>Status</span>
            <span />
          </div>

          {loading && rows.length === 0 ? (
            <p className="py-16 text-center text-sm" style={{ color: POS.inkSoft }}>Loading…</p>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm" style={{ color: POS.inkSoft }}>
              No orders match that.
            </p>
          ) : (
            rows.map((row) => {
              const chip = STATUS_CHIP[row.status];
              const items = Array.isArray(row.items) ? row.items : [];
              const refunded = Number(row.refunded_total) || 0;
              return (
                <div
                  key={row.id}
                  className="grid items-center gap-2 px-4 py-2.5 text-[13px]"
                  style={{ gridTemplateColumns: COLUMNS, borderBottom: `1px solid ${POS.line}` }}
                >
                  <span className="font-black" style={{ color: POS.ink }}>{row.code}</span>
                  <span style={{ color: POS.inkSoft }}>{when(row.created_at)}</span>
                  <span className="flex items-center gap-1.5 truncate" style={{ color: POS.inkSoft }}>
                    <SourceIcon channel={row.source} />
                    <span className="truncate">{row.source_label}</span>
                  </span>
                  <span className="truncate" style={{ color: POS.ink }}>
                    {row.guest_name || row.phone || "—"}
                  </span>
                  <span className="truncate" style={{ color: POS.inkSoft }}>
                    {items.length
                      ? items.map((i) => `${i.qty ?? 1}× ${i.name ?? ""}`).join(", ")
                      : "—"}
                  </span>
                  <span className="text-end font-bold" style={{ color: POS.ink }}>
                    {money(row.total_amount)}
                    {refunded > 0 && (
                      /* Said on the row rather than netted into the total: the
                         customer was charged that and given some of it back,
                         and both halves are facts somebody may be querying. */
                      <span className="block text-[11px] font-semibold" style={{ color: POS.bad }}>
                        −{aed(refunded)} refunded
                      </span>
                    )}
                  </span>
                  <span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{ background: chip?.chip ?? POS.page, color: chip?.ink ?? POS.inkSoft }}
                    >
                      {chip?.label ?? row.status}
                    </span>
                  </span>
                  <span className="flex justify-end gap-1">
                    <button
                      onClick={() => printDocument(`/pos/invoice/${encodeURIComponent(row.id)}`)}
                      aria-label={`Print ${row.code}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ background: POS.page, color: POS.ink }}
                    >
                      <Printer size={14} />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => { setError(""); setConfirm(row); }}
                        aria-label={`Delete ${row.code}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ background: POS.badSoft, color: POS.bad }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {pages > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12.5px]" style={{ color: POS.inkSoft }}>
              Page {page + 1} of {pages}
            </span>
            <span className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg px-4 text-[13px] font-bold disabled:opacity-35"
                style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 38 }}
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                disabled={page >= pages - 1}
                className="rounded-lg px-4 text-[13px] font-bold disabled:opacity-35"
                style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 38 }}
              >
                Next
              </button>
            </span>
          </div>
        )}
      </div>

      {/* ─── Deleting for good ─── */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="w-full max-w-[420px] rounded-2xl bg-white p-6 text-center">
            <span
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: POS.badSoft }}
            >
              <Trash2 size={22} style={{ color: POS.bad }} />
            </span>
            <h2 className="mt-3 text-lg font-black" style={{ color: POS.ink }}>
              Delete {confirm.code}?
            </h2>
            <p className="mt-1.5 text-[13px]" style={{ color: POS.inkSoft }}>
              This removes the order and anything refunded against it, for good. An order on a
              shift that has already been closed cannot be deleted — its takings are part of a
              signed-off total, and cancelling and refunding it is the way to undo one of those.
            </p>

            {error && (
              <p
                className="mt-3 rounded-lg px-3 py-2.5 text-[12px] font-semibold"
                style={{ background: POS.badSoft, color: POS.bad }}
              >
                {error}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => { setConfirm(null); setError(""); }}
                disabled={busy}
                className="flex-1 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ background: POS.page, color: POS.ink, height: 46 }}
              >
                Keep it
              </button>
              <button
                onClick={remove}
                disabled={busy}
                className="flex-1 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: POS.bad, height: 46 }}
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PosShell>
  );
}

const COLUMNS = "110px 130px 1.1fr 1fr 1.6fr 120px 100px 84px";
