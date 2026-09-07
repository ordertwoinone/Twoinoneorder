"use client";

import { useState } from "react";
import { POS } from "@/lib/pos/theme";
import {
  KIND_LABEL,
  WRITEOFF_REASONS,
  aed,
  type InventoryItem,
  type MovementKind,
} from "@/lib/inventory/types";
import { ErrorNote, Field, Modal, Select, Text } from "./ui";

/**
 * Recording one movement by hand.
 *
 * The same form for a delivery, an issue to the bar and a broken bottle,
 * because they are the same row — what changes is which fields it insists on.
 * A write-off will not save without a reason: a quantity taken off the books
 * that nobody can explain is exactly the entry an auditor asks about, and the
 * moment to ask is while the person who saw it happen is still standing there.
 */

const NEEDS_REASON: MovementKind[] = ["writeoff", "waste"];

export default function EntryDialog({
  kind,
  items,
  date,
  onClose,
  onSaved,
}: {
  kind: MovementKind;
  items: Pick<InventoryItem, "id" | "name" | "uom" | "unit_cost" | "category">[];
  date: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    item_id: items[0]?.id ?? "",
    movement_date: date,
    quantity: "",
    unit_cost: "",
    reason: NEEDS_REASON.includes(kind) ? String(WRITEOFF_REASONS[0]) : "",
    reference: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const item = items.find((i) => i.id === form.item_id) ?? null;
  const quantity = Number(form.quantity) || 0;
  // Blank means "whatever the item costs today", which is what the route does
  // with it — shown here so the value is not a surprise after saving.
  const cost = form.unit_cost === "" ? (item?.unit_cost ?? 0) : Number(form.unit_cost) || 0;

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    if (!form.item_id) return setError("Pick an item");
    if (quantity <= 0) return setError("Enter a quantity");
    if (NEEDS_REASON.includes(kind) && !form.reason) return setError("Say why it is being written off");

    setBusy(true);
    setError("");

    const res = await fetch("/api/pos/inventory/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, kind, quantity }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(body?.error ?? "Could not save that entry");
      setBusy(false);
      return;
    }
    setBusy(false);
    onSaved();
  }

  return (
    <Modal
      title={`Record ${KIND_LABEL[kind].toLowerCase()}`}
      subtitle={
        NEEDS_REASON.includes(kind)
          ? "This comes straight off the stock and off the books, so it needs a reason."
          : "Booked into the ledger against the day you give it."
      }
      onClose={onClose}
    >
      <div className="space-y-3">
        <Field label="Item">
          <Select
            value={form.item_id}
            onChange={(v) => set("item_id", v)}
            options={items.map((i) => ({ value: i.id, label: `${i.name} · ${i.uom}` }))}
            placeholder={items.length ? undefined : "No items yet"}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input
              type="date"
              value={form.movement_date}
              onChange={(e) => set("movement_date", e.target.value)}
              className="w-full rounded-lg bg-white px-3 py-2.5 text-[13px] focus:outline-none"
              style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
            />
          </Field>
          <Field label={`Quantity${item ? ` (${item.uom})` : ""}`}>
            <Text value={form.quantity} onChange={(v) => set("quantity", v)} placeholder="0" numeric />
          </Field>
        </div>

        {NEEDS_REASON.includes(kind) && (
          <Field label="Reason">
            <Select value={form.reason} onChange={(v) => set("reason", v)} options={WRITEOFF_REASONS} />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Unit cost (AED)"
            hint={form.unit_cost === "" ? "Blank uses the item's own cost" : undefined}
          >
            <Text
              value={form.unit_cost}
              onChange={(v) => set("unit_cost", v)}
              placeholder={String(item?.unit_cost ?? 0)}
              numeric
            />
          </Field>
          <Field
            label={kind === "received" ? "Delivery note no." : "Document no."}
            hint={NEEDS_REASON.includes(kind) ? "Blank numbers it for you" : undefined}
          >
            <Text value={form.reference} onChange={(v) => set("reference", v)} placeholder="Optional" />
          </Field>
        </div>

        {kind === "received" && (
          <Field label="Supplier / note">
            <Text value={form.reason} onChange={(v) => set("reason", v)} placeholder="Optional" />
          </Field>
        )}

        <Field label="Note">
          <Text value={form.note} onChange={(v) => set("note", v)} placeholder="Optional" />
        </Field>

        <div
          className="flex items-center justify-between rounded-lg px-3 py-2.5"
          style={{ background: POS.page }}
        >
          <span className="text-[12px] font-semibold" style={{ color: POS.inkSoft }}>
            Value of this entry
          </span>
          <span className="text-base font-black" style={{ color: POS.ink }}>
            {aed(Math.round(quantity * cost * 100) / 100)}
          </span>
        </div>

        <ErrorNote message={error} />

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg py-3 text-[13px] font-bold"
            style={{ border: `1px solid ${POS.line}`, color: POS.inkSoft }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy || items.length === 0}
            className="flex-1 rounded-lg py-3 text-[13px] font-bold text-white disabled:opacity-60"
            style={{ background: POS.action }}
          >
            {busy ? "Saving…" : "Save entry"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
