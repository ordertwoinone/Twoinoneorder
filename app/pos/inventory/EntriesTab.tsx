"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import {
  KIND_LABEL,
  aed,
  isoDate,
  prettyDate,
  qty,
  writeOffValue,
  type InventoryMovement,
  type MovementKind,
} from "@/lib/inventory/types";
import type { ItemWithStock, TabKey } from "./InventoryScreen";
import EntryDialog from "./EntryDialog";
import { ErrorNote, Stat } from "./ui";

/**
 * The four list views: deliveries in, stock issued out, what was lost, and
 * everything at once.
 *
 * One component for all of them because they are one table with a different
 * filter over it — and because a delivery and a breakage looking different
 * from each other on screen would suggest they are different kinds of record,
 * which is the misconception this whole design exists to avoid.
 */

const VIEWS: Record<
  Exclude<TabKey, "count" | "valuation">,
  { kinds: MovementKind[]; title: string; blurb: string; add: MovementKind[] }
> = {
  received: {
    kinds: ["received", "opening"],
    title: "Goods received",
    blurb: "Deliveries booked in, and the opening balances items started with.",
    add: ["received"],
  },
  consumed: {
    kinds: ["consumed"],
    title: "Stock consumed",
    blurb: "Stock issued to the counter, sold, or used up.",
    add: ["consumed"],
  },
  waste: {
    kinds: ["writeoff", "waste"],
    title: "Waste & expiry",
    blurb: "Stock that left without being sold. Every entry carries a reason.",
    add: ["writeoff", "waste"],
  },
  ledger: {
    kinds: [],
    title: "Movement ledger",
    blurb: "Every movement, newest first — including the corrections posted counts made.",
    add: [],
  },
};

/** N days before an ISO date, as an ISO date. */
function daysBefore(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - days);
  return isoDate(d);
}

export default function EntriesTab({
  tab,
  items,
  date,
  onChanged,
}: {
  tab: Exclude<TabKey, "count" | "valuation">;
  items: ItemWithStock[];
  date: string;
  onChanged: () => void;
}) {
  const view = VIEWS[tab];

  const [from, setFrom] = useState(() => daysBefore(date, 30));
  const [to, setTo] = useState(date);
  const [itemId, setItemId] = useState("");
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<MovementKind | null>(null);
  const [removing, setRemoving] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    if (view.kinds.length) params.set("kind", view.kinds.join(","));
    if (itemId) params.set("item_id", itemId);

    const res = await fetch(`/api/pos/inventory/movements?${params}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body?.error ?? "Could not load those entries");
    else {
      setMovements(body.movements ?? []);
      setError("");
    }
    setLoading(false);
  }, [from, to, itemId, view.kinds]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(
    () => ({
      quantity: movements.reduce((sum, m) => sum + Math.abs(m.quantity), 0),
      value: movements.reduce((sum, m) => sum + writeOffValue(m), 0),
    }),
    [movements],
  );

  async function remove(id: string) {
    setRemoving(id);
    const res = await fetch(`/api/pos/inventory/movements/${id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body?.error ?? "Could not remove that entry");
    else {
      await load();
      // The count sheet's columns are built from these rows, so it has just
      // become wrong by exactly this entry.
      onChanged();
    }
    setRemoving("");
  }

  const control = { border: `1px solid ${POS.line}`, color: POS.ink } as const;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Entries" value={String(movements.length)} hint={`${prettyDate(from)} — ${prettyDate(to)}`} />
        <Stat label="Total quantity" value={`${qty(totals.quantity)} units`} />
        <Stat
          label="Total value"
          value={aed(totals.value)}
          tone={tab === "waste" ? POS.bad : undefined}
        />
      </div>

      {error && <ErrorNote message={error} />}

      <section className="rounded-2xl bg-white" style={{ border: `1px solid ${POS.line}` }}>
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3" style={{ borderColor: POS.line }}>
          <div className="mr-auto">
            <h2 className="text-sm font-black" style={{ color: POS.ink }}>{view.title}</h2>
            <p className="text-[11.5px]" style={{ color: POS.inkSoft }}>{view.blurb}</p>
          </div>

          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg bg-white px-3 py-2 text-[12.5px] focus:outline-none"
            style={control}
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg bg-white px-3 py-2 text-[12.5px] focus:outline-none"
            style={control}
          />
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="rounded-lg bg-white px-3 py-2 text-[12.5px] focus:outline-none"
            style={control}
          >
            <option value="">All items</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>

          {view.add.map((kind) => (
            <button
              key={kind}
              onClick={() => setAdding(kind)}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-bold text-white"
              style={{ background: kind === "received" || kind === "consumed" ? POS.action : POS.bad }}
            >
              <Plus size={14} />
              {kind === "received" ? "Book delivery" : kind === "consumed" ? "Record usage" : KIND_LABEL[kind]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-14 text-center text-[13px]" style={{ color: POS.inkSoft }}>Loading…</p>
        ) : movements.length === 0 ? (
          <p className="py-14 text-center text-[13px]" style={{ color: POS.inkSoft }}>
            Nothing recorded between {prettyDate(from)} and {prettyDate(to)}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]" style={{ minWidth: 900 }}>
              <thead>
                <tr style={{ background: POS.page, color: POS.inkSoft }}>
                  {["Date", "Document", "Item", tab === "ledger" ? "Movement" : "Reason", "Quantity", "Unit cost", "Value", "Entered by", ""].map(
                    (h, i) => (
                      <th
                        key={h || i}
                        className={`px-3 py-2.5 text-[10.5px] font-black uppercase tracking-wide ${i >= 4 && i <= 6 ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const outward = m.kind === "consumed" || m.kind === "writeoff" || m.kind === "waste";
                  return (
                    <tr key={m.id} style={{ borderTop: `1px solid ${POS.line}` }}>
                      <td className="px-3 py-2.5" style={{ color: POS.inkSoft }}>{prettyDate(m.movement_date)}</td>
                      <td className="px-3 py-2.5 font-bold" style={{ color: "#1D4ED8" }}>{m.reference || "—"}</td>
                      <td className="px-3 py-2.5 font-semibold" style={{ color: POS.ink }}>{m.item?.name ?? "—"}</td>
                      <td className="px-3 py-2.5" style={{ color: POS.inkSoft }}>
                        {tab === "ledger" ? KIND_LABEL[m.kind] : m.reason || "—"}
                      </td>
                      <td
                        className="px-3 py-2.5 text-right font-bold tabular-nums"
                        style={{ color: outward ? POS.bad : POS.good }}
                      >
                        {/* Signed by which way it moved, so a ledger scrolled
                            past at speed still reads as a running balance. */}
                        {outward ? "−" : m.kind === "count_adjustment" && m.quantity < 0 ? "" : "+"}
                        {qty(Math.abs(m.quantity))} {m.item?.uom ?? ""}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: POS.inkSoft }}>
                        {aed(m.unit_cost)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-black tabular-nums" style={{ color: POS.ink }}>
                        {aed(Math.abs(writeOffValue(m)))}
                      </td>
                      <td className="px-3 py-2.5" style={{ color: POS.inkSoft }}>{m.entered_by || "—"}</td>
                      <td className="px-3 py-2.5 text-right">
                        {m.kind !== "count_adjustment" && (
                          <button
                            onClick={() => remove(m.id)}
                            disabled={removing === m.id}
                            className="rounded p-1.5 disabled:opacity-40"
                            style={{ color: POS.bad }}
                            aria-label="Remove this entry"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {adding && (
        <EntryDialog
          kind={adding}
          items={items}
          date={date}
          onClose={() => setAdding(null)}
          onSaved={() => { setAdding(null); load(); onChanged(); }}
        />
      )}
    </div>
  );
}
