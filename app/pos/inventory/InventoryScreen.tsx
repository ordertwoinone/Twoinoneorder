"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Plus, RefreshCw } from "lucide-react";
import PosShell from "@/components/pos/PosShell";
import { POS } from "@/lib/pos/theme";
import type { PosStaff } from "@/lib/pos/constants";
import {
  isoDate,
  prettyDate,
  type InventoryItem,
  type SheetPayload,
  type SheetRow,
} from "@/lib/inventory/types";
import StockCountTab from "./StockCountTab";
import EntriesTab from "./EntriesTab";
import ValuationTab from "./ValuationTab";
import ItemDialog from "./ItemDialog";
import { ErrorNote } from "./ui";

/**
 * Stock control, for a branch that counts its own shelves.
 *
 * Six views of one ledger. The count sheet is the working screen — a day, every
 * item on it, what moved and what is actually there — and the other five are
 * that same data asked a different question: what came in, what went out, what
 * was lost, what it is all worth, and everything in the order it happened.
 *
 * Every figure except the physical count is derived on the server from
 * inventory_movements, so nothing here can drift out of step with its own
 * history. What this screen owns is the typing: it holds edits locally until
 * Apply, which is what makes a stock-take on a tablet in a store room bearable
 * — you walk the shelves keying numbers in, and the round trip happens once at
 * the end rather than on every cell you leave.
 */

export type ItemWithStock = InventoryItem & { on_hand: number };

/** One row's pending edits. Absent keys were not touched. */
export interface RowEdit {
  received?: number;
  consumed?: number;
  physical?: number | null;
}

export type Edits = Record<string, RowEdit>;

const TABS = [
  { key: "count", label: "Stock Count" },
  { key: "received", label: "Goods Received" },
  { key: "consumed", label: "Stock Consumed" },
  { key: "waste", label: "Waste & Expiry" },
  { key: "valuation", label: "Inventory Valuation" },
  { key: "ledger", label: "Movement Ledger" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

/** A row with its pending edits laid over it, which is what the screen draws. */
export function withEdits(row: SheetRow, edit: RowEdit | undefined): SheetRow {
  if (!edit) return row;
  return {
    ...row,
    received: edit.received ?? row.received,
    consumed: edit.consumed ?? row.consumed,
    physical: edit.physical !== undefined ? edit.physical : row.physical,
  };
}

export default function InventoryScreen({ staff }: { staff: PosStaff }) {
  const [tab, setTab] = useState<TabKey>("count");
  const [date, setDate] = useState(isoDate());
  const [location, setLocation] = useState("");

  const [sheet, setSheet] = useState<SheetPayload | null>(null);
  const [items, setItems] = useState<ItemWithStock[]>([]);
  const [edits, setEdits] = useState<Edits>({});

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [newItem, setNewItem] = useState(false);

  const loadSheet = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ date });
    if (location) params.set("location", location);
    const res = await fetch(`/api/pos/inventory/sheet?${params}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body?.error ?? "Could not load the stock sheet");
    else {
      setSheet(body as SheetPayload);
      // Applied edits are in the numbers now; keeping them would re-send the
      // same corrections on the next Apply and book them a second time.
      setEdits({});
    }
    setLoading(false);
  }, [date, location]);

  const loadItems = useCallback(async () => {
    const res = await fetch("/api/pos/inventory/items", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (res.ok) setItems(body.items ?? []);
  }, []);

  useEffect(() => { loadSheet(); }, [loadSheet]);
  useEffect(() => { loadItems(); }, [loadItems]);

  /** Every location any item is filed under, for the picker. */
  const locations = useMemo(
    () => Array.from(new Set(items.map((i) => i.location).filter(Boolean))).sort(),
    [items],
  );

  const dirtyCount = useMemo(
    () => Object.values(edits).reduce((total, edit) => total + Object.keys(edit).length, 0),
    [edits],
  );

  function editRow(itemId: string, patch: RowEdit) {
    setEdits((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }));
  }

  async function applyEdits() {
    if (!sheet || dirtyCount === 0) return;
    setBusy(true);
    setError("");

    const rows = Object.entries(edits).map(([item_id, edit]) => ({ item_id, ...edit }));
    const res = await fetch("/api/pos/inventory/sheet", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, location, rows }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) setError(body?.error ?? "Could not save those changes");
    else {
      setSheet(body as SheetPayload);
      setEdits({});
      loadItems();
    }
    setBusy(false);
  }

  async function postCount() {
    if (!sheet) return;
    setBusy(true);
    setError("");

    const res = await fetch("/api/pos/inventory/sheet/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, location }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) setError(body?.error ?? "Could not post this count");
    else {
      setSheet(body.sheet as SheetPayload);
      setEdits({});
      loadItems();
    }
    setBusy(false);
  }

  /** After anything that writes a movement from one of the other tabs. */
  const refresh = useCallback(() => {
    loadSheet();
    loadItems();
  }, [loadSheet, loadItems]);

  const rows = (sheet?.rows ?? []).map((row) => withEdits(row, edits[row.item.id]));

  return (
    <PosShell
      staff={staff}
      title="Stock Control"
      subtitle={`${prettyDate(date)} · ${sheet?.count.reference ?? "…"}${location ? ` · ${location}` : ""}`}
      actions={
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || isoDate())}
            className="rounded-lg bg-white px-3 py-2 text-[13px] font-semibold focus:outline-none"
            style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
          />
          {locations.length > 0 && (
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-lg bg-white px-3 py-2 text-[13px] font-semibold focus:outline-none"
              style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
            >
              <option value="">All locations</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
          <button
            onClick={refresh}
            className="rounded-lg p-2"
            style={{ border: `1px solid ${POS.line}`, color: POS.inkSoft }}
            aria-label="Reload"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setNewItem(true)}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-bold text-white"
            style={{ background: POS.action }}
          >
            <Plus size={15} />
            Create item
          </button>
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* ─── The six views ─── */}
        <div
          className="pos-chrome shrink-0 overflow-x-auto border-b bg-white px-3"
          style={{ borderColor: POS.line }}
        >
          <div className="flex gap-1 py-2">
            {TABS.map((entry) => {
              const active = tab === entry.key;
              return (
                <button
                  key={entry.key}
                  onClick={() => setTab(entry.key)}
                  className="shrink-0 rounded-lg px-3.5 py-2 text-[12.5px] font-bold transition-colors"
                  style={{
                    background: active ? POS.action : "transparent",
                    color: active ? "#fff" : POS.inkSoft,
                  }}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pos-scroll min-h-0 flex-1 p-4">
          {error && <div className="mb-3"><ErrorNote message={error} /></div>}

          {loading && !sheet ? (
            <p className="py-20 text-center text-[13px]" style={{ color: POS.inkSoft }}>
              Loading the stock sheet…
            </p>
          ) : items.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed py-20 text-center"
              style={{ borderColor: POS.line, background: "#fff" }}
            >
              <Boxes size={26} className="mx-auto" style={{ color: POS.inkSoft }} />
              <p className="mt-3 text-sm font-bold" style={{ color: POS.ink }}>Nothing is stocked yet</p>
              <p className="mx-auto mt-1 max-w-md text-[13px]" style={{ color: POS.inkSoft }}>
                Add the drinks, packets and supplies the branch keeps on the shelf. Each one carries
                its own cost and unit, and everything that moves it is recorded from the day it is
                added.
              </p>
              <button
                onClick={() => setNewItem(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-bold text-white"
                style={{ background: POS.action }}
              >
                <Plus size={15} />
                Create the first item
              </button>
            </div>
          ) : tab === "count" ? (
            <StockCountTab
              sheet={sheet}
              rows={rows}
              edits={edits}
              dirtyCount={dirtyCount}
              busy={busy}
              date={date}
              onEdit={editRow}
              onReset={() => setEdits({})}
              onApply={applyEdits}
              onPost={postCount}
              onChanged={refresh}
            />
          ) : tab === "valuation" ? (
            <ValuationTab items={items} onChanged={() => { loadItems(); loadSheet(); }} />
          ) : (
            <EntriesTab
              key={tab}
              tab={tab}
              items={items}
              date={date}
              onChanged={refresh}
            />
          )}
        </div>
      </div>

      {newItem && (
        <ItemDialog
          onClose={() => setNewItem(false)}
          onSaved={() => { setNewItem(false); refresh(); }}
        />
      )}
    </PosShell>
  );
}
