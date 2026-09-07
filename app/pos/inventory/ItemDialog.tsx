"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { sizedImage } from "@/lib/image-url";
import { UOM_OPTIONS, aed, carryingRate, type InventoryItem } from "@/lib/inventory/types";
import { ErrorNote, Field, Modal, Select, Text } from "./ui";

/**
 * Adding something to the shelf, or correcting what is already on it.
 *
 * The opening quantity only appears when creating, and it is not a field on the
 * item — it books an `opening` movement dated the day given. An item's stock has
 * a dated row behind it from its very first figure, the same as every other
 * number in here, so "where did that 112 come from" always has an answer.
 *
 * Editing deliberately cannot change the quantity. Stock moves by being
 * received, consumed, written off or counted; a hand-edited balance with no
 * movement behind it is exactly the untraceable figure this design exists to
 * make impossible. Wrong balances are fixed by counting.
 */
export default function ItemDialog({
  item,
  onClose,
  onSaved,
}: {
  item?: InventoryItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = Boolean(item);

  const [form, setForm] = useState({
    name: item?.name ?? "",
    name_ar: item?.name_ar ?? "",
    sku: item?.sku ?? "",
    category: item?.category ?? "",
    uom: item?.uom ?? "Can",
    location: item?.location ?? "",
    unit_cost: item ? String(item.unit_cost) : "",
    nrv: item ? String(item.nrv) : "",
    reorder_level: item ? String(item.reorder_level) : "",
    image_url: item?.image_url ?? "",
    opening_quantity: "",
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const filePicker = useRef<HTMLInputElement>(null);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  /**
   * The photo goes up on its own, before the item is saved.
   *
   * So the field holds a URL by the time anything is submitted, and a failed
   * upload costs you the picture rather than the form you have just filled in.
   * The camera opens directly on a tablet — `capture` is what makes the shelf
   * photo a two-tap job rather than a trip through a file browser.
   */
  async function upload(file: File) {
    setUploading(true);
    setError("");

    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch("/api/pos/inventory/upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) setError(data?.error ?? "That image could not be uploaded");
      else set("image_url", data.url);
    } catch {
      setError("That image could not be uploaded");
    }
    setUploading(false);
  }

  const cost = Number(form.unit_cost) || 0;
  const nrv = Number(form.nrv) || 0;
  const rate = carryingRate({ unit_cost: cost, nrv });

  async function save() {
    if (!form.name.trim()) return setError("Give the item a name");

    setBusy(true);
    setError("");

    const payload = {
      name: form.name,
      name_ar: form.name_ar,
      sku: form.sku,
      category: form.category,
      uom: form.uom,
      location: form.location,
      unit_cost: cost,
      nrv,
      reorder_level: Number(form.reorder_level) || 0,
      image_url: form.image_url,
      ...(editing ? {} : { opening_quantity: Number(form.opening_quantity) || 0 }),
    };

    const res = await fetch(
      editing ? `/api/pos/inventory/items/${item!.id}` : "/api/pos/inventory/items",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(body?.error ?? "Could not save that item");
      setBusy(false);
      return;
    }
    setBusy(false);
    onSaved();
  }

  return (
    <Modal
      title={editing ? `Edit ${item!.name}` : "Create an item"}
      subtitle={
        editing
          ? "Costs apply from now on. Movements already recorded keep the cost they were booked at."
          : "Everything the branch keeps on the shelf, counted in its own unit."
      }
      onClose={onClose}
      width={560}
    >
      <div className="space-y-3">
        {/* ─── The photo, and the two names ─── */}
        <div className="flex gap-3">
          <div className="shrink-0">
            <p className="mb-1 text-[11.5px] font-semibold" style={{ color: POS.inkSoft }}>Photo</p>
            <button
              type="button"
              onClick={() => filePicker.current?.click()}
              disabled={uploading}
              className="relative flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-xl"
              style={{
                border: form.image_url ? `1px solid ${POS.line}` : `1.5px dashed ${POS.line}`,
                background: POS.page,
              }}
              aria-label={form.image_url ? "Replace the photo" : "Add a photo"}
            >
              {uploading ? (
                <Loader2 size={20} className="animate-spin" style={{ color: POS.inkSoft }} />
              ) : form.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={sizedImage(form.image_url, 200)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex flex-col items-center gap-1" style={{ color: POS.inkSoft }}>
                  <ImagePlus size={20} />
                  <span className="text-[10px] font-bold">Add photo</span>
                </span>
              )}
            </button>

            {form.image_url && !uploading && (
              <button
                type="button"
                onClick={() => set("image_url", "")}
                className="mt-1 flex w-[88px] items-center justify-center gap-1 rounded-md py-1 text-[10.5px] font-bold"
                style={{ color: POS.bad }}
              >
                <X size={11} />
                Remove
              </button>
            )}

            <input
              ref={filePicker}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
                // Cleared so picking the same file twice still fires a change.
                e.target.value = "";
              }}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <Field label="Name">
              <Text value={form.name} onChange={(v) => set("name", v)} placeholder="Coca-Cola Can 330ml" />
            </Field>
            <Field label="Name in Arabic">
              <Text value={form.name_ar} onChange={(v) => set("name_ar", v)} placeholder="Optional" />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Category">
            <Text value={form.category} onChange={(v) => set("category", v)} placeholder="Soft Drinks" />
          </Field>
          <Field label="Unit">
            <Select value={form.uom} onChange={(v) => set("uom", v)} options={UOM_OPTIONS} />
          </Field>
          <Field label="Item code">
            <Text value={form.sku} onChange={(v) => set("sku", v)} placeholder="Optional" />
          </Field>
        </div>

        <Field label="Location" hint="The branch or store room this sits in. Used to filter the count sheet.">
          <Text value={form.location} onChange={(v) => set("location", v)} placeholder="University Kalba" />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Unit cost (AED)">
            <Text value={form.unit_cost} onChange={(v) => set("unit_cost", v)} placeholder="0.00" numeric />
          </Field>
          <Field label="NRV (AED)" hint="Blank carries it at cost">
            <Text value={form.nrv} onChange={(v) => set("nrv", v)} placeholder="0.00" numeric />
          </Field>
          <Field label="Reorder level" hint="0 turns the flag off">
            <Text value={form.reorder_level} onChange={(v) => set("reorder_level", v)} placeholder="0" numeric />
          </Field>
        </div>

        {!editing && (
          <Field
            label="Opening quantity"
            hint="What is on the shelf today. Booked as an opening balance dated today."
          >
            <Text
              value={form.opening_quantity}
              onChange={(v) => set("opening_quantity", v)}
              placeholder="0"
              numeric
            />
          </Field>
        )}

        {cost > 0 && (
          <div
            className="flex items-center justify-between rounded-lg px-3 py-2.5"
            style={{ background: POS.page }}
          >
            <span className="text-[12px] font-semibold" style={{ color: POS.inkSoft }}>
              Carried at {rate < cost ? "NRV — below cost" : "cost"}
            </span>
            <span className="text-base font-black" style={{ color: rate < cost ? POS.warn : POS.ink }}>
              {aed(rate)}
            </span>
          </div>
        )}

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
            disabled={busy}
            className="flex-1 rounded-lg py-3 text-[13px] font-bold text-white disabled:opacity-60"
            style={{ background: POS.action }}
          >
            {busy ? "Saving…" : editing ? "Save changes" : "Create item"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
