"use client";
import { useEffect, useState } from "react";
import { Save, Receipt, Type, Coins, FileText, Building2 } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import InvoiceSheet from "@/components/admin/InvoiceSheet";
import {
  DEFAULT_INVOICE_SETTINGS,
  type InvoiceSettings,
} from "@/lib/invoice-settings";
import type { InvoiceOrder } from "@/lib/invoice";

/**
 * admin → Invoice.
 *
 * Previewed with the same component the printed page uses, fed straight from
 * the form, so there is no second rendering of the invoice to keep in step.
 * The sample order below is only stand-in data — the real one comes from the
 * order being printed.
 */

type Form = InvoiceSettings & { id?: string };

/** Stand-in figures, shaped like the reference receipt. */
const SAMPLE: InvoiceOrder = {
  id: "sample",
  order_number: 33861,
  type: "table",
  order_type: "Dine-in",
  guest_name: "",
  phone: "",
  table_id: "7A",
  table_section: "",
  guests: 2,
  notes: "",
  status: "completed",
  created_at: new Date().toISOString(),
  items: [
    { name: "Turkish Breakfast 2 Portion", qty: 1, unit_price: 84, line_total: 84 },
    { name: "Menemen With Soujuk", qty: 1, unit_price: 38, line_total: 38 },
  ],
  subtotal: 116.19,
  discount_total: 0,
  tax_amount: 5.81,
  total_amount: 122,
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function InvoiceSettingsAdmin() {
  const [form, setForm] = useState<Form>({ ...DEFAULT_INVOICE_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  /* The table arrives with a hand-run migration. Without it the form would look
     like it works and save nowhere, so say so instead. */
  const [ready, setReady] = useState(true);

  useEffect(() => {
    fetch("/api/admin/invoice-settings")
      .then((r) => r.json())
      .then((data) => {
        setForm({ ...DEFAULT_INVOICE_SETTINGS, ...data });
        setReady(Boolean(data?.id));
        setLoading(false);
      });
  }, []);

  function set(key: keyof InvoiceSettings, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/admin/invoice-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setReady(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading invoice settings...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">
            Orders
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">Invoice</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Every word printed on a customer&apos;s tax invoice
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-70 shrink-0"
          style={{ background: saved ? "#16a34a" : "#ea580c" }}
        >
          <Save size={15} />
          {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
        </button>
      </div>

      {!ready && (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-5">
          Run <code className="font-mono">supabase/invoice_settings.sql</code> and{" "}
          <code className="font-mono">supabase/order_invoices.sql</code> in the Supabase SQL editor
          before saving — there is nowhere to store this, and orders have no number to print, until
          then.
        </p>
      )}

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* ── The fields ─────────────────────────────────────────── */}
        <div>
          <Section icon={Building2} title="Header">
            <Toggle
              label="Show the logo"
              hint="Blank image below falls back to the site logo from Settings."
              checked={form.show_logo}
              onChange={(v) => set("show_logo", v)}
            />
            <ImageUploadField
              label="Invoice logo"
              value={form.logo_url}
              onChange={(v) => set("logo_url", v)}
              folder="brand"
              hint="black on white prints best"
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Business name" value={form.business_name} onChange={(v) => set("business_name", v)} />
              <Field label="Branch line" value={form.branch_line} onChange={(v) => set("branch_line", v)} />
              <Field label="TRN label" value={form.trn_label} onChange={(v) => set("trn_label", v)} />
              <Field label="TRN number" value={form.trn_number} onChange={(v) => set("trn_number", v)} placeholder="104812722700003" />
              <Field label="Telephone label" value={form.tel_label} onChange={(v) => set("tel_label", v)} />
              <Field label="Telephone number" value={form.tel_number} onChange={(v) => set("tel_number", v)} placeholder="971551275050" />
            </div>
          </Section>

          <Section icon={FileText} title="Title">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Invoice title" value={form.title} onChange={(v) => set("title", v)} />
              <Field label="Number label" value={form.number_label} onChange={(v) => set("number_label", v)} />
            </div>
          </Section>

          <Section icon={Type} title="Order details">
            <p className="text-xs text-gray-400 -mt-1">
              Empty a label to leave that row off the invoice entirely.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Order type label" value={form.order_type_label} onChange={(v) => set("order_type_label", v)} />
              <Field label="Table number label" value={form.table_label} onChange={(v) => set("table_label", v)} />
              <Field label="Staff label" value={form.staff_label} onChange={(v) => set("staff_label", v)} />
              <Field label="Staff name" value={form.staff_name} onChange={(v) => set("staff_name", v)} />
              <Field label="Customer label" value={form.customer_label} onChange={(v) => set("customer_label", v)} />
              <Field label="Phone label" value={form.phone_label} onChange={(v) => set("phone_label", v)} />
            </div>
          </Section>

          <Section icon={Receipt} title="Item table">
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Quantity column" value={form.qty_label} onChange={(v) => set("qty_label", v)} />
              <Field label="Item column" value={form.item_label} onChange={(v) => set("item_label", v)} />
              <Field label="Amount column" value={form.amount_label} onChange={(v) => set("amount_label", v)} />
            </div>
          </Section>

          <Section icon={Coins} title="Totals">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Subtotal" value={form.subtotal_label} onChange={(v) => set("subtotal_label", v)} />
              <Field label="Discount" value={form.discount_label} onChange={(v) => set("discount_label", v)} />
              <Field label="Tax" value={form.tax_label} onChange={(v) => set("tax_label", v)} />
              <Field label="Surcharges" value={form.surcharge_label} onChange={(v) => set("surcharge_label", v)} />
              <Field label="Total" value={form.total_label} onChange={(v) => set("total_label", v)} />
              <Field label="Payment method" value={form.payment_label} onChange={(v) => set("payment_label", v)} />
              <Field label="Total paid" value={form.paid_label} onChange={(v) => set("paid_label", v)} />
              <Field label="Currency before amounts" value={form.currency_symbol} onChange={(v) => set("currency_symbol", v)} placeholder="blank, or AED" />
              <Field label="Tips" value={form.tips_label} onChange={(v) => set("tips_label", v)} />
              <Field label="Change" value={form.change_label} onChange={(v) => set("change_label", v)} />
            </div>

            <div className="space-y-3 pt-1">
              <Toggle label="Show surcharges row" hint="" checked={form.show_surcharge} onChange={(v) => set("show_surcharge", v)} />
              <Toggle label="Show payment and total paid" hint="" checked={form.show_paid} onChange={(v) => set("show_paid", v)} />
              <Toggle label="Show tips row" hint="" checked={form.show_tips} onChange={(v) => set("show_tips", v)} />
              <Toggle label="Show change row" hint="" checked={form.show_change} onChange={(v) => set("show_change", v)} />
            </div>
          </Section>

          <Section icon={FileText} title="Footer">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Footer line</label>
              <textarea
                value={form.footer_text}
                onChange={(e) => set("footer_text", e.target.value)}
                rows={2}
                placeholder="Thank you for your order."
                className={`${inputCls} resize-y`}
              />
            </div>
          </Section>
        </div>

        {/* ── Live preview ───────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Preview
          </p>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="scale-[0.86] origin-top">
              <InvoiceSheet order={SAMPLE} settings={form} />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Sample figures. A real invoice carries the order&apos;s own number, items and totals.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50">
        <Icon size={16} className="text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        {hint && <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${
          checked ? "bg-orange-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
