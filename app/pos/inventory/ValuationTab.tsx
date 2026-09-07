"use client";

import { Fragment, useMemo, useState } from "react";
import { AlertTriangle, Coins, Package, Pencil, Power, Trash2 } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { sizedImage } from "@/lib/image-url";
import { aed, carryingRate, qty, round2 } from "@/lib/inventory/types";
import type { ItemWithStock } from "./InventoryScreen";
import ItemDialog from "./ItemDialog";
import { CategoryValueChart } from "./charts";
import { ErrorNote, Pill, Stat } from "./ui";

/**
 * What the stock is worth, and the place items themselves are maintained.
 *
 * The two belong on one screen because they answer each other: the reason to
 * open an item and change its cost is almost always having just seen what that
 * cost is doing to the valuation.
 *
 * Balances here are as at now rather than as at a date — "what is on the shelf"
 * is the question this screen answers, and the dated version of it is what the
 * count sheet is for.
 */
export default function ValuationTab({
  items,
  onChanged,
}: {
  items: ItemWithStock[];
  onChanged: () => void;
}) {
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<ItemWithStock | null>(null);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!showInactive && !item.is_active) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle) ||
        (item.sku ?? "").toLowerCase().includes(needle)
      );
    });
  }, [items, search, showInactive]);

  const totals = useMemo(() => {
    const value = visible.reduce((sum, item) => sum + item.on_hand * carryingRate(item), 0);
    const atCost = visible.reduce((sum, item) => sum + item.on_hand * item.unit_cost, 0);
    return {
      value: round2(value),
      atCost: round2(atCost),
      /* The gap between the two is the IAS 2 write-down: what the stock cost
         less what it can realistically be sold for. It is normally zero, and
         when it is not it is the number somebody wants explaining. */
      writeDown: round2(atCost - value),
      units: visible.reduce((sum, item) => sum + item.on_hand, 0),
      low: visible.filter((item) => item.reorder_level > 0 && item.on_hand <= item.reorder_level).length,
    };
  }, [visible]);

  /** By category, because that is how a purchase order gets written. */
  const groups = useMemo(() => {
    const map = new Map<string, ItemWithStock[]>();
    for (const item of visible) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visible]);

  const categoryValues = useMemo(
    () =>
      groups.map(([category, list]) => ({
        category,
        value: round2(list.reduce((sum, i) => sum + i.on_hand * carryingRate(i), 0)),
        units: list.reduce((sum, i) => sum + i.on_hand, 0),
      })),
    [groups],
  );

  async function toggleActive(item: ItemWithStock) {
    setBusyId(item.id);
    setError("");
    const res = await fetch(`/api/pos/inventory/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    if (!res.ok) setError((await res.json().catch(() => ({})))?.error ?? "Could not update that item");
    else onChanged();
    setBusyId("");
  }

  async function remove(item: ItemWithStock) {
    if (!confirm(`Delete ${item.name}?`)) return;
    setBusyId(item.id);
    setError("");
    setNotice("");

    const res = await fetch(`/api/pos/inventory/items/${item.id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) setError(body?.error ?? "Could not delete that item");
    else {
      // An item with history is switched off rather than deleted, and saying so
      // beats having it silently reappear the moment "show switched off" is on.
      if (body?.deactivated) setNotice(body.message ?? "");
      onChanged();
    }
    setBusyId("");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Stock on hand" value={`${qty(totals.units)} units`} icon={<Package size={17} />} />
        <Stat label="Value at cost" value={aed(totals.atCost)} icon={<Coins size={17} />} />
        <Stat
          label="Carrying value"
          value={aed(totals.value)}
          hint="At the lower of cost and NRV"
          icon={<Coins size={17} />}
          tone={POS.good}
        />
        <Stat
          label={totals.writeDown > 0 ? "NRV write-down" : "Below reorder level"}
          value={totals.writeDown > 0 ? aed(totals.writeDown) : String(totals.low)}
          hint={totals.writeDown > 0 ? "Cost above what it can be sold for" : "Items needing an order"}
          icon={<AlertTriangle size={17} />}
          tone={totals.writeDown > 0 || totals.low > 0 ? POS.warn : undefined}
        />
      </div>

      <CategoryValueChart rows={categoryValues} />

      {error && <ErrorNote message={error} />}
      {notice && (
        <p
          className="rounded-lg px-3 py-2 text-[12.5px] font-semibold"
          style={{ background: "#EFF6FF", color: "#1E3A8A" }}
        >
          {notice}
        </p>
      )}

      <section className="rounded-2xl bg-white" style={{ border: `1px solid ${POS.line}` }}>
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3" style={{ borderColor: POS.line }}>
          <h2 className="mr-auto text-sm font-black" style={{ color: POS.ink }}>Items &amp; valuation</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item…"
            className="w-44 rounded-lg bg-white px-3 py-2 text-[12.5px] focus:outline-none"
            style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
          />
          <label className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: POS.inkSoft }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show switched off
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]" style={{ minWidth: 980 }}>
            <thead>
              <tr style={{ background: POS.page, color: POS.inkSoft }}>
                {["Item", "UOM", "On hand", "Reorder at", "Unit cost", "NRV", "Carried at", "Value", ""].map((h, i) => (
                  <th
                    key={h || i}
                    className={`px-3 py-2.5 text-[10.5px] font-black uppercase tracking-wide ${i >= 2 && i <= 7 ? "text-right" : "text-left"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(([category, list]) => (
                <Fragment key={category}>
                  <tr style={{ background: "#FAFAFB" }}>
                    <td
                      colSpan={9}
                      className="px-3 py-1.5 text-[10.5px] font-black uppercase tracking-wide"
                      style={{ color: POS.inkSoft, borderTop: `1px solid ${POS.line}` }}
                    >
                      {category}
                      <span className="ms-2 font-bold" style={{ color: POS.ink }}>
                        {aed(round2(list.reduce((s, i) => s + i.on_hand * carryingRate(i), 0)))}
                      </span>
                    </td>
                  </tr>
                  {list.map((item) => {
                    const rate = carryingRate(item);
                    const low = item.reorder_level > 0 && item.on_hand <= item.reorder_level;
                    return (
                      <tr key={item.id} style={{ borderTop: `1px solid ${POS.line}` }}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                              style={{ background: POS.page, opacity: item.is_active ? 1 : 0.45 }}
                            >
                              {item.image_url ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={sizedImage(item.image_url, 200)}
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-[14px] font-black" style={{ color: "#C9CFD4" }}>
                                  {item.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 font-bold leading-tight" style={{ color: POS.ink }}>
                                {item.name}
                                {!item.is_active && <Pill label="Off" className="bg-gray-100 text-gray-500" />}
                                {low && <Pill label="Reorder" className="bg-amber-50 text-amber-700" />}
                              </p>
                              {(item.sku || item.location) && (
                                <p className="text-[10.5px] leading-tight" style={{ color: POS.inkSoft }}>
                                  {[item.sku, item.location].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5" style={{ color: POS.inkSoft }}>{item.uom}</td>
                        <td
                          className="px-3 py-2.5 text-right font-black tabular-nums"
                          style={{ color: item.on_hand < 0 ? POS.bad : low ? POS.warn : POS.ink }}
                        >
                          {qty(item.on_hand)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: POS.inkSoft }}>
                          {item.reorder_level > 0 ? qty(item.reorder_level) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: POS.inkSoft }}>
                          {aed(item.unit_cost)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: POS.inkSoft }}>
                          {item.nrv ? aed(item.nrv) : "—"}
                        </td>
                        <td
                          className="px-3 py-2.5 text-right font-bold tabular-nums"
                          style={{ color: rate < item.unit_cost ? POS.warn : POS.ink }}
                        >
                          {aed(rate)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-black tabular-nums" style={{ color: POS.ink }}>
                          {aed(round2(item.on_hand * rate))}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setEditing(item)}
                              className="rounded p-1.5"
                              style={{ color: POS.inkSoft }}
                              aria-label={`Edit ${item.name}`}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => toggleActive(item)}
                              disabled={busyId === item.id}
                              className="rounded p-1.5 disabled:opacity-40"
                              style={{ color: item.is_active ? POS.inkSoft : POS.good }}
                              aria-label={item.is_active ? `Switch ${item.name} off` : `Switch ${item.name} on`}
                            >
                              <Power size={14} />
                            </button>
                            <button
                              onClick={() => remove(item)}
                              disabled={busyId === item.id}
                              className="rounded p-1.5 disabled:opacity-40"
                              style={{ color: POS.bad }}
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${POS.line}`, background: POS.page }}>
                <td colSpan={7} className="px-3 py-2.5 font-black" style={{ color: POS.ink }}>
                  Total carrying value
                </td>
                <td className="px-3 py-2.5 text-right font-black tabular-nums" style={{ color: POS.ink }}>
                  {aed(totals.value)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {editing && (
        <ItemDialog
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChanged(); }}
        />
      )}
    </div>
  );
}
