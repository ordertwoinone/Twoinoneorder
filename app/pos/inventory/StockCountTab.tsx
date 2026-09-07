"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, BarChart3, CheckCheck, ChevronDown, ClipboardList, Coins, Download, FileText,
  Info, Package, Pencil, Plus, Trash2,
} from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { sizedImage } from "@/lib/image-url";
import {
  STATUS_STYLE,
  aed,
  bookClosing,
  carryingRate,
  carryingValue,
  prettyDate,
  qty,
  rowStatus,
  signed,
  variance,
  writeOffValue,
  type InventoryItem,
  type SheetPayload,
  type SheetRow,
} from "@/lib/inventory/types";
import type { Edits, RowEdit } from "./InventoryScreen";
import EntryDialog from "./EntryDialog";
import { DayFlowChart, VarianceChart } from "./charts";
import { COLUMN_TONE, ErrorNote, Pill, StepCell, Stat } from "./ui";

/**
 * The count sheet.
 *
 * Read left to right it is the whole argument: what was there this morning,
 * what came in, what went out, what was lost — therefore what the books say is
 * left, against what is actually on the shelf. The two right-hand columns are
 * the only ones anybody types into; every other figure is the ledger's answer,
 * recomputed as you type so the closing balance moves with the delivery you are
 * keying in rather than after it.
 *
 * Nothing is written until Apply, and nothing is accepted until Post. Those are
 * two different promises: Apply saves the day's movements, Post says the count
 * itself is right and lets it correct the books.
 */

const MIN_TABLE_WIDTH = 1240;

export default function StockCountTab({
  sheet,
  rows,
  edits,
  dirtyCount,
  busy,
  date,
  onEdit,
  onReset,
  onApply,
  onPost,
  onChanged,
  onEditItem,
}: {
  sheet: SheetPayload | null;
  rows: SheetRow[];
  edits: Edits;
  dirtyCount: number;
  busy: boolean;
  date: string;
  onEdit: (itemId: string, patch: RowEdit) => void;
  onReset: () => void;
  onApply: () => void;
  onPost: () => void;
  onChanged: () => void;
  onEditItem: (item: InventoryItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [writeOff, setWriteOff] = useState<"writeoff" | "waste" | null>(null);
  const [confirmPost, setConfirmPost] = useState(false);
  /* Open by default — the pictures are the reason to glance at this screen when
     you are not counting. Collapsible because when you *are* counting, they are
     three hundred pixels between you and the row you are typing into. */
  const [showCharts, setShowCharts] = useState(true);
  const [removing, setRemoving] = useState("");
  const [error, setError] = useState("");

  const posted = sheet?.count.status === "posted";

  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.item.category))).sort(),
    [rows],
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (category && row.item.category !== category) return false;
      if (status && rowStatus(row) !== status) return false;
      if (!needle) return true;
      return (
        row.item.name.toLowerCase().includes(needle) ||
        (row.item.sku ?? "").toLowerCase().includes(needle) ||
        row.item.category.toLowerCase().includes(needle)
      );
    });
  }, [rows, search, category, status]);

  /* Totals follow the filter on purpose. Someone who has narrowed the sheet to
     the fridge is asking what the fridge is worth, and a footer that kept
     answering for the whole store room would be quietly wrong every time. */
  const totals = useMemo(() => {
    const seed = {
      opening: 0, received: 0, consumed: 0, writeoffs: 0, waste: 0,
      book: 0, physical: 0, variance: 0, value: 0, counted: 0,
    };
    return visible.reduce((acc, row) => {
      const book = bookClosing(row);
      const v = variance(row);
      return {
        opening: acc.opening + row.opening,
        received: acc.received + row.received,
        consumed: acc.consumed + row.consumed,
        writeoffs: acc.writeoffs + row.writeoffs,
        waste: acc.waste + row.waste,
        book: acc.book + book,
        physical: acc.physical + (row.physical ?? 0),
        variance: acc.variance + (v ?? 0),
        value: acc.value + carryingValue(row),
        counted: acc.counted + (row.physical === null ? 0 : 1),
      };
    }, seed);
  }, [visible]);

  const registerTotal = (sheet?.register ?? []).reduce((sum, m) => sum + writeOffValue(m), 0);

  /* The formula in the blue note above, as six bars. Consumption and the two
     losses are negated here rather than in the chart, so the waterfall stays a
     dumb renderer of signed steps and the meaning of "out" lives with the sheet
     that knows it. */
  const flowSteps = useMemo(
    () => [
      { label: "Opening balance", delta: totals.opening, total: true },
      { label: "Goods received", delta: totals.received },
      { label: "Stock consumed", delta: -totals.consumed },
      { label: "Write-offs", delta: -totals.writeoffs, loss: true },
      { label: "Waste", delta: -totals.waste, loss: true },
      { label: "Book closing", delta: totals.book, total: true },
    ],
    [totals],
  );

  const varianceBars = useMemo(
    () =>
      visible
        .filter((row) => row.physical !== null)
        .map((row) => {
          const delta = variance(row) ?? 0;
          return {
            name: row.item.name,
            uom: row.item.uom,
            variance: delta,
            // What the discrepancy is worth, which is the figure a manager
            // actually reacts to — four missing bottles of water and four
            // missing energy drinks are not the same problem.
            value: delta * carryingRate(row.item),
          };
        }),
    [visible],
  );

  async function removeEntry(id: string) {
    setRemoving(id);
    setError("");
    const res = await fetch(`/api/pos/inventory/movements/${id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body?.error ?? "Could not remove that entry");
    else onChanged();
    setRemoving("");
  }

  /** The sheet as a spreadsheet, for whoever files the month end. */
  function exportCsv() {
    const header = [
      "Item", "Category", "UOM", "Unit cost", "NRV", "Opening", "Goods received",
      "Stock consumed", "Write-offs", "Waste", "Book closing", "Physical count",
      "Variance", "Carrying value", "Status",
    ];
    const lines = visible.map((row) => [
      row.item.name, row.item.category, row.item.uom, row.item.unit_cost, row.item.nrv,
      row.opening, row.received, row.consumed, row.writeoffs, row.waste,
      bookClosing(row), row.physical ?? "", variance(row) ?? "",
      carryingValue(row), STATUS_STYLE[rowStatus(row)].label,
    ]);

    const csv = [header, ...lines]
      // Quoted throughout: an item called "Water 500ml, pack of 6" splits a
      // bare CSV into two columns and shunts every figure one place left.
      .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sheet?.count.reference ?? "stock-count"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /** The same figures as a message, for the group the branch actually reads. */
  function whatsappReport() {
    const shortages = visible.filter((r) => rowStatus(r) === "shortage");
    const lines = [
      `*Stock Count — ${prettyDate(date)}*`,
      sheet?.count.reference ?? "",
      "",
      `Book closing: ${qty(totals.book)} units`,
      `Physical count: ${qty(totals.physical)} units`,
      `Variance: ${signed(totals.variance)} units`,
      `Carrying value: ${aed(totals.value)}`,
      `Write-off & waste: ${aed(registerTotal)}`,
      "",
      shortages.length ? "*Shortages*" : "No shortages.",
      ...shortages.map((r) => `• ${r.item.name}: ${signed(variance(r) ?? 0)} ${r.item.uom}`),
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.filter((l) => l !== undefined).join("\n"))}`, "_blank");
  }

  const control = {
    border: `1px solid ${POS.line}`,
    color: POS.ink,
  } as const;

  return (
    <div className="space-y-4">
      {/* ─── Where the day stands ─── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label="Book closing stock"
          value={`${qty(totals.book)} units`}
          hint="What the ledger says is left"
          icon={<Package size={17} />}
        />
        <Stat
          label="Physical count"
          value={`${qty(totals.physical)} units`}
          hint={`${totals.counted} of ${visible.length} items counted`}
          icon={<ClipboardList size={17} />}
          tone={POS.warn}
        />
        <Stat
          label="Stock variance"
          value={`${signed(totals.variance)} units`}
          hint={totals.variance === 0 ? "Books and shelf agree" : "Counted less what was expected"}
          icon={<AlertTriangle size={17} />}
          tone={totals.variance === 0 ? POS.good : POS.bad}
        />
        <Stat
          label="Carrying value"
          value={aed(totals.value)}
          hint="At the lower of cost and NRV"
          icon={<Coins size={17} />}
        />
        <Stat
          label="Write-off & waste"
          value={aed(registerTotal)}
          hint={`${sheet?.register.length ?? 0} entr${(sheet?.register.length ?? 0) === 1 ? "y" : "ies"} today`}
          icon={<FileText size={17} />}
          tone={registerTotal > 0 ? POS.bad : undefined}
        />
      </div>

      {/* ─── How the figures are arrived at ─── */}
      <div className="rounded-2xl px-4 py-3" style={{ background: "#EFF6FF", border: "1px solid #DBEAFE" }}>
        <div className="flex gap-2.5">
          <Info size={16} className="mt-0.5 shrink-0" style={{ color: "#1D4ED8" }} />
          <div className="text-[12.5px] leading-relaxed" style={{ color: "#1E3A8A" }}>
            <span className="font-bold">Stock is measured at the lower of cost and net realisable value.</span>{" "}
            Manual entries throughout — nothing here is booked until you apply it, and nothing corrects
            the books until the count is posted.
            <div className="mt-1 font-semibold">
              Book closing stock = Opening + Goods received − Stock consumed − Write-offs − Waste
            </div>
          </div>
        </div>
      </div>

      {/* ─── The same figures, drawn ─── */}
      <div>
        <button
          onClick={() => setShowCharts((open) => !open)}
          className="flex items-center gap-2 rounded-lg px-1 py-1 text-[12px] font-bold"
          style={{ color: POS.inkSoft }}
        >
          <BarChart3 size={14} />
          {showCharts ? "Hide charts" : "Show charts"}
          <ChevronDown
            size={13}
            style={{ transform: showCharts ? "rotate(180deg)" : "none", transition: "transform .2s" }}
          />
        </button>

        {showCharts && (
          <div className="mt-2 grid gap-3 xl:grid-cols-2">
            <DayFlowChart steps={flowSteps} />
            <VarianceChart bars={varianceBars} />
          </div>
        )}
      </div>

      {error && <ErrorNote message={error} />}

      {/* ─── The sheet ─── */}
      <section className="rounded-2xl bg-white" style={{ border: `1px solid ${POS.line}` }}>
        <div
          className="flex flex-wrap items-center gap-2 border-b px-4 py-3"
          style={{ borderColor: POS.line }}
        >
          <h2 className="mr-auto text-sm font-black" style={{ color: POS.ink }}>
            Manual reconciliation &amp; valuation
          </h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item…"
            className="w-40 rounded-lg bg-white px-3 py-2 text-[12.5px] focus:outline-none"
            style={control}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg bg-white px-3 py-2 text-[12.5px] focus:outline-none"
            style={control}
          >
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg bg-white px-3 py-2 text-[12.5px] focus:outline-none"
            style={control}
          >
            <option value="">All statuses</option>
            <option value="matched">Matched</option>
            <option value="shortage">Shortage</option>
            <option value="excess">Excess</option>
            <option value="uncounted">Not counted</option>
          </select>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-bold"
            style={{ ...control, color: POS.inkSoft }}
          >
            <Download size={14} />
            Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]" style={{ minWidth: MIN_TABLE_WIDTH }}>
            <thead>
              <tr style={{ background: POS.page, color: POS.inkSoft }}>
                {[
                  "Item", "UOM", "Unit cost", "NRV", "Opening", "Goods received", "Stock consumed",
                  "Write-offs", "Waste", "Book closing", "Physical count", "Variance",
                  "Carrying value", "Status",
                ].map((heading, i) => (
                  <th
                    key={heading}
                    className={`px-2.5 py-2.5 text-[10.5px] font-black uppercase tracking-wide ${i === 0 ? "text-left" : "text-center"}`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-14 text-center text-[13px]" style={{ color: POS.inkSoft }}>
                    Nothing matches those filters.
                  </td>
                </tr>
              ) : (
                visible.map((row) => {
                  const edit = edits[row.item.id];
                  const book = bookClosing(row);
                  const v = variance(row);
                  const state = rowStatus(row);
                  return (
                    <tr key={row.item.id} style={{ borderTop: `1px solid ${POS.line}` }}>
                      <td className="px-2.5 py-2">
                        <div className="group flex items-center gap-2.5">
                          <ItemThumb item={row.item} />
                          <div className="min-w-0">
                            <p className="truncate font-bold leading-tight" style={{ color: POS.ink }}>
                              {row.item.name}
                            </p>
                            <p className="truncate text-[10.5px] leading-tight" style={{ color: POS.inkSoft }}>
                              {row.item.category}
                              {row.item.sku ? ` · ${row.item.sku}` : ""}
                            </p>
                          </div>
                          {/* Always rendered, only visible on hover or focus —
                              a pencil per row shouting at twenty-eight lines
                              would drown out the figures the sheet is for, but
                              one that appears only on hover is unreachable by
                              keyboard, hence focus-within. */}
                          <button
                            onClick={() => onEditItem(row.item)}
                            className="ms-auto shrink-0 rounded p-1.5 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                            style={{ color: POS.inkSoft }}
                            aria-label={`Edit ${row.item.name}`}
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      </td>
                      <td className="px-2.5 py-2 text-center" style={{ color: POS.inkSoft }}>{row.item.uom}</td>
                      <td className="px-2.5 py-2 text-center tabular-nums" style={{ color: POS.inkSoft }}>
                        {aed(row.item.unit_cost)}
                      </td>
                      <td className="px-2.5 py-2 text-center tabular-nums" style={{ color: POS.inkSoft }}>
                        {row.item.nrv ? aed(row.item.nrv) : "—"}
                      </td>
                      <td className="px-2.5 py-2 text-center font-bold tabular-nums" style={{ color: POS.ink }}>
                        {qty(row.opening)}
                      </td>
                      <td className="px-1.5 py-2" style={{ width: 108 }}>
                        <StepCell
                          value={row.received}
                          onChange={(next) => onEdit(row.item.id, { received: next ?? 0 })}
                          tone={COLUMN_TONE.received}
                          dirty={edit?.received !== undefined}
                          disabled={posted}
                        />
                      </td>
                      <td className="px-1.5 py-2" style={{ width: 108 }}>
                        <StepCell
                          value={row.consumed}
                          onChange={(next) => onEdit(row.item.id, { consumed: next ?? 0 })}
                          tone={COLUMN_TONE.consumed}
                          dirty={edit?.consumed !== undefined}
                          disabled={posted}
                        />
                      </td>
                      {/* Read-only, and deliberately so: a write-off needs a
                          reason attached, which a stepper cannot ask for. The
                          register below is where they are added. */}
                      <td className="px-2.5 py-2 text-center font-bold tabular-nums" style={{ color: row.writeoffs ? POS.bad : POS.inkSoft }}>
                        {qty(row.writeoffs)}
                      </td>
                      <td className="px-2.5 py-2 text-center font-bold tabular-nums" style={{ color: row.waste ? POS.bad : POS.inkSoft }}>
                        {qty(row.waste)}
                      </td>
                      <td className="px-2.5 py-2 text-center font-black tabular-nums" style={{ color: "#1D4ED8" }}>
                        {qty(book)}
                      </td>
                      <td className="px-1.5 py-2" style={{ width: 112 }}>
                        <StepCell
                          value={row.physical}
                          onChange={(next) => onEdit(row.item.id, { physical: next })}
                          tone={COLUMN_TONE.physical}
                          dirty={edit?.physical !== undefined}
                          disabled={posted}
                          placeholder="—"
                        />
                      </td>
                      <td
                        className="px-2.5 py-2 text-center font-black tabular-nums"
                        style={{ color: v === null ? POS.inkSoft : v === 0 ? POS.good : v < 0 ? POS.bad : "#1D4ED8" }}
                      >
                        {v === null ? "—" : signed(v)}
                      </td>
                      <td className="px-2.5 py-2 text-center font-bold tabular-nums" style={{ color: POS.ink }}>
                        {aed(carryingValue(row))}
                      </td>
                      <td className="px-2.5 py-2 text-center">
                        <Pill {...STATUS_STYLE[state]} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {visible.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: `2px solid ${POS.line}`, background: POS.page }}>
                  <td className="px-2.5 py-2.5 font-black" style={{ color: POS.ink }}>Total</td>
                  <td colSpan={3} />
                  {[totals.opening, totals.received, totals.consumed, totals.writeoffs, totals.waste, totals.book, totals.physical].map(
                    (value, i) => (
                      <td key={i} className="px-2.5 py-2.5 text-center font-black tabular-nums" style={{ color: POS.ink }}>
                        {qty(value)}
                      </td>
                    ),
                  )}
                  <td
                    className="px-2.5 py-2.5 text-center font-black tabular-nums"
                    style={{ color: totals.variance === 0 ? POS.good : POS.bad }}
                  >
                    {signed(totals.variance)}
                  </td>
                  <td className="px-2.5 py-2.5 text-center font-black tabular-nums" style={{ color: POS.ink }}>
                    {aed(totals.value)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ─── Pending typing ─── */}
        <div
          className="flex flex-wrap items-center gap-3 border-t px-4 py-3"
          style={{ borderColor: POS.line }}
        >
          <p className="mr-auto text-[12px]" style={{ color: POS.inkSoft }}>
            Showing {visible.length} of {rows.length} item{rows.length === 1 ? "" : "s"}
          </p>

          {posted ? (
            <p className="text-[12.5px] font-bold" style={{ color: POS.good }}>
              This count is posted — its figures are in the ledger.
            </p>
          ) : (
            <>
              {dirtyCount > 0 && (
                <span className="flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: POS.warn }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: POS.warn }} />
                  {dirtyCount} manual change{dirtyCount === 1 ? "" : "s"} pending
                </span>
              )}
              <button
                onClick={onReset}
                disabled={dirtyCount === 0 || busy}
                className="rounded-lg px-4 py-2 text-[12.5px] font-bold disabled:opacity-40"
                style={{ border: `1px solid ${POS.line}`, color: POS.inkSoft }}
              >
                Reset changes
              </button>
              <button
                onClick={onApply}
                disabled={dirtyCount === 0 || busy}
                className="rounded-lg px-4 py-2 text-[12.5px] font-bold text-white disabled:opacity-40"
                style={{ background: POS.action }}
              >
                {busy ? "Saving…" : "Apply all changes"}
              </button>
            </>
          )}
        </div>
      </section>

      {/* ─── What was lost ─── */}
      <section className="rounded-2xl bg-white" style={{ border: `1px solid ${POS.line}` }}>
        <div
          className="flex flex-wrap items-center gap-2 border-b px-4 py-3"
          style={{ borderColor: POS.line }}
        >
          <h2 className="mr-auto text-sm font-black" style={{ color: POS.ink }}>
            Write-off &amp; waste register
          </h2>
          {!posted && (
            <>
              <button
                onClick={() => setWriteOff("writeoff")}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-bold"
                style={{ border: `1px solid ${POS.line}`, color: POS.bad }}
              >
                <Plus size={14} />
                Write-off
              </button>
              <button
                onClick={() => setWriteOff("waste")}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-bold"
                style={{ border: `1px solid ${POS.line}`, color: POS.bad }}
              >
                <Plus size={14} />
                Waste
              </button>
            </>
          )}
        </div>

        {(sheet?.register.length ?? 0) === 0 ? (
          <p className="py-10 text-center text-[13px]" style={{ color: POS.inkSoft }}>
            Nothing written off on {prettyDate(date)}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]" style={{ minWidth: 860 }}>
              <thead>
                <tr style={{ background: POS.page, color: POS.inkSoft }}>
                  {["Document", "Item", "Reason", "Quantity", "Unit cost", "Value", "Entered by", ""].map((h, i) => (
                    <th
                      key={h || i}
                      className={`px-3 py-2.5 text-[10.5px] font-black uppercase tracking-wide ${i > 2 && i < 6 ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet?.register.map((entry) => (
                  <tr key={entry.id} style={{ borderTop: `1px solid ${POS.line}` }}>
                    <td className="px-3 py-2.5 font-bold" style={{ color: "#1D4ED8" }}>
                      {entry.reference || "—"}
                    </td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: POS.ink }}>
                      {entry.item?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: POS.inkSoft }}>{entry.reason}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: POS.ink }}>
                      {qty(entry.quantity)} {entry.item?.uom ?? ""}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: POS.inkSoft }}>
                      {aed(entry.unit_cost)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-black tabular-nums" style={{ color: POS.bad }}>
                      {aed(writeOffValue(entry))}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: POS.inkSoft }}>{entry.entered_by || "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      {!posted && (
                        <button
                          onClick={() => removeEntry(entry.id)}
                          disabled={removing === entry.id}
                          className="rounded p-1.5 disabled:opacity-40"
                          style={{ color: POS.bad }}
                          aria-label="Remove this entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: `2px solid ${POS.line}` }}>
                  <td colSpan={5} className="px-3 py-2.5 font-black" style={{ color: POS.ink }}>
                    Total write-off &amp; waste expense
                  </td>
                  <td className="px-3 py-2.5 text-right font-black tabular-nums" style={{ color: POS.bad }}>
                    {aed(registerTotal)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── Signing it off ─── */}
      <section
        className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-white px-4 py-3.5"
        style={{ border: `1px solid ${POS.line}` }}
      >
        <span className="flex items-center gap-2 text-sm font-black" style={{ color: POS.ink }}>
          <ClipboardList size={17} style={{ color: POS.action }} />
          Complete count &amp; report
        </span>

        <Detail label="Reference" value={sheet?.count.reference ?? "—"} />
        <Detail label="Entered by" value={sheet?.count.entered_by || "—"} />
        <Detail
          label="Status"
          value={posted ? "Posted" : "Draft"}
          tone={posted ? POS.good : POS.warn}
        />
        <Detail label="Counted" value={`${totals.counted} of ${visible.length}`} />

        <div className="ms-auto flex items-center gap-2">
          <button
            onClick={whatsappReport}
            className="rounded-lg px-4 py-2.5 text-[12.5px] font-bold"
            style={{ border: `1px solid ${POS.line}`, color: POS.good }}
          >
            Send WhatsApp report
          </button>
          {!posted && (
            <button
              onClick={() => setConfirmPost(true)}
              disabled={busy || totals.counted === 0}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[12.5px] font-bold text-white disabled:opacity-40"
              style={{ background: POS.action }}
            >
              <CheckCheck size={15} />
              Complete &amp; post
            </button>
          )}
        </div>
      </section>

      {writeOff && (
        <EntryDialog
          kind={writeOff}
          items={rows.map((r) => r.item)}
          date={date}
          onClose={() => setWriteOff(null)}
          onSaved={() => { setWriteOff(null); onChanged(); }}
        />
      )}

      {confirmPost && sheet && (
        <PostConfirm
          reference={sheet.count.reference}
          date={date}
          counted={totals.counted}
          uncounted={rows.length - rows.filter((r) => r.physical !== null).length}
          variance={totals.variance}
          pending={dirtyCount}
          busy={busy}
          onCancel={() => setConfirmPost(false)}
          onConfirm={() => { setConfirmPost(false); onPost(); }}
        />
      )}
    </div>
  );
}

/**
 * An item's photo at the size the sheet draws it.
 *
 * The initial rather than a broken-image icon when there is none, the same as
 * the till grid does — a row without a picture should still have something to
 * aim a finger at, and a torn-page glyph reads as an error rather than as a
 * blank a manager could fill in.
 */
function ItemThumb({ item }: { item: InventoryItem }) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg"
      style={{ background: POS.page }}
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
        <span className="text-[13px] font-black" style={{ color: "#C9CFD4" }}>
          {item.name.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

function Detail({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <span className="leading-tight">
      <span className="block text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: POS.inkSoft }}>
        {label}
      </span>
      <span className="block text-[13px] font-black" style={{ color: tone ?? POS.ink }}>{value}</span>
    </span>
  );
}

/**
 * The last word before the books are corrected.
 *
 * Posting cannot be undone, so the two things most likely to make it wrong are
 * spelled out first: typing still sitting unapplied, and items nobody counted.
 * An uncounted item is left alone rather than treated as zero — "we did not get
 * to the store room" must never book the store room as empty.
 */
function PostConfirm({
  reference, date, counted, uncounted, variance: varianceTotal, pending, busy, onCancel, onConfirm,
}: {
  reference: string;
  date: string;
  counted: number;
  uncounted: number;
  variance: number;
  pending: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-black" style={{ color: POS.ink }}>Post this count?</h2>
        <p className="mt-1 text-[13px]" style={{ color: POS.inkSoft }}>
          {reference} · {prettyDate(date)}
        </p>

        <ul className="mt-4 space-y-2 text-[13px]" style={{ color: POS.ink }}>
          <li className="flex justify-between gap-4">
            <span style={{ color: POS.inkSoft }}>Items counted</span>
            <span className="font-bold">{counted}</span>
          </li>
          <li className="flex justify-between gap-4">
            <span style={{ color: POS.inkSoft }}>Left uncounted</span>
            <span className="font-bold">{uncounted}</span>
          </li>
          <li className="flex justify-between gap-4">
            <span style={{ color: POS.inkSoft }}>Net variance</span>
            <span className="font-bold" style={{ color: varianceTotal === 0 ? POS.good : POS.bad }}>
              {signed(varianceTotal)} units
            </span>
          </li>
        </ul>

        {pending > 0 && (
          <p
            className="mt-3 rounded-lg px-3 py-2 text-[12.5px] font-semibold"
            style={{ background: POS.badSoft, color: POS.bad }}
          >
            {pending} change{pending === 1 ? " is" : "s are"} still unapplied and will not be included.
            Cancel and press Apply first.
          </p>
        )}

        <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: POS.inkSoft }}>
          Every counted line that disagrees with the books is corrected in the ledger, dated{" "}
          {prettyDate(date)}. Items nobody counted are left exactly as they are. This cannot be
          undone — a count posted in error is corrected by counting again.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg py-3 text-[13px] font-bold"
            style={{ border: `1px solid ${POS.line}`, color: POS.inkSoft }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-lg py-3 text-[13px] font-bold text-white disabled:opacity-60"
            style={{ background: POS.action }}
          >
            {busy ? "Posting…" : "Post the count"}
          </button>
        </div>
      </div>
    </div>
  );
}
