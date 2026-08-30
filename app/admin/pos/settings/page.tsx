"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Save } from "lucide-react";
import { DEFAULT_POS_SETTINGS, type PosSettings } from "@/lib/pos/settings";

/**
 * admin → POS → Settings.
 *
 * The numbers the till enforces: what delivery costs, how far a cashier may
 * discount before a manager is needed, what the drawer should open with, and
 * where the day-close summary goes. Every one of these is checked again on the
 * server — this page sets them, it is not what makes them stick.
 */

type Form = PosSettings & { id?: string };

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function PosSettingsAdmin() {
  const [form, setForm] = useState<Form>({ ...DEFAULT_POS_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/pos/settings")
      .then((r) => r.json())
      .then((d) => { if (d && !d.error) setForm({ ...DEFAULT_POS_SETTINGS, ...d }); })
      .finally(() => setLoading(false));
  }, []);

  function field<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/admin/pos/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Point of Sale</p>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            What the till charges and what it will let a cashier do on their own.
          </p>
          <a
            href="/pos/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-orange-600 hover:underline"
          >
            Open the till <ExternalLink size={12} />
          </a>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 shrink-0"
          style={{ background: saved ? "#16a34a" : "#ea580c" }}
        >
          <Save size={15} />
          {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
        </button>
      </div>

      <div className="space-y-6">
        <Card title="Orders">
          <div className="grid grid-cols-2 gap-3">
            <Text
              label="Order prefix"
              hint="printed on the docket"
              value={form.order_prefix}
              onChange={(v) => field("order_prefix", v.toUpperCase().slice(0, 6))}
            />
            <Num
              label="Opening float (AED)"
              hint="what the drawer should start with"
              value={form.expected_float}
              onChange={(v) => field("expected_float", v)}
            />
          </div>
        </Card>

        <Card title="Delivery">
          <div className="grid grid-cols-2 gap-3">
            <Num
              label="Delivery charge (AED)"
              value={form.delivery_charge}
              onChange={(v) => field("delivery_charge", v)}
            />
            <Num
              label="Free over (AED)"
              hint="0 never waives it"
              value={form.free_delivery_over}
              onChange={(v) => field("free_delivery_over", v)}
            />
          </div>
          <p className="text-[11px] text-gray-500">
            The delivery charge is never discounted — a percentage off the bill should not quietly
            come off the driver&rsquo;s fee.
          </p>
        </Card>

        <Card title="What a cashier may do alone">
          <div className="grid grid-cols-2 gap-3">
            <Num
              label="Max discount (%)"
              hint="past this, a manager signs in"
              value={form.max_cashier_discount_percent}
              onChange={(v) => field("max_cashier_discount_percent", v)}
            />
            <Num
              label="Manager needed over (AED)"
              hint="for an expense"
              value={form.manager_expense_over}
              onChange={(v) => field("manager_expense_over", v)}
            />
          </div>
          <p className="text-[11px] text-gray-500">
            Cancelling an order and closing the day always need a manager, whatever these are set
            to.
          </p>
        </Card>

        <Card title="Day close report">
          <Text
            label="WhatsApp number"
            hint="with country code, e.g. 9715XXXXXXXX"
            value={form.whatsapp_report_to}
            onChange={(v) => field("whatsapp_report_to", v.replace(/[^\d+]/g, ""))}
          />
          <Text
            label="Sent to"
            hint="how the till labels it"
            value={form.whatsapp_report_label}
            onChange={(v) => field("whatsapp_report_label", v)}
          />
          <p className="text-[11px] text-gray-500">
            The till opens WhatsApp with the summary ready to send — it does not send on its own,
            which would need a WhatsApp Business API account.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      {children}
    </section>
  );
}

function Text({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}
        {hint && <span className="text-gray-400 font-normal"> — {hint}</span>}
      </label>
      <input type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </div>
  );
}

function Num({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}
        {hint && <span className="text-gray-400 font-normal"> — {hint}</span>}
      </label>
      <input
        type="number"
        min={0}
        value={Number.isFinite(Number(value)) ? Number(value) : 0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className={inputCls}
      />
    </div>
  );
}
