"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Save } from "lucide-react";
import BilingualField from "@/components/admin/BilingualField";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { DEFAULT_KIOSK_SETTINGS, type KioskSettings } from "@/lib/kiosk/types";

/**
 * admin → Kiosk → Screen.
 *
 * Everything about the standing screen except what it sells. The menu is the
 * University Kalba one — priced and edited there, and right on all three
 * surfaces at once — so there is deliberately nothing on this page that adds a
 * dish.
 */

type Form = KioskSettings & { id?: string };

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

interface MenuItem {
  id: string;
  name: string;
  price: string;
  is_active: boolean;
}

export default function KioskScreenAdmin() {
  const [form, setForm] = useState<Form>({ ...DEFAULT_KIOSK_SETTINGS });
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/kiosk/settings").then((r) => r.json()),
      fetch("/api/admin/kiosk/menu-items").then((r) => r.json()),
    ])
      .then(([settings, items]) => {
        if (settings && !settings.error) {
          setForm({
            ...DEFAULT_KIOSK_SETTINGS,
            ...settings,
            combo_item_ids: Array.isArray(settings.combo_item_ids) ? settings.combo_item_ids : [],
          });
        }
        if (Array.isArray(items)) setMenu(items as MenuItem[]);
      })
      .finally(() => setLoading(false));
  }, []);

  function field<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function toggleComboItem(id: string) {
    setForm((f) => ({
      ...f,
      combo_item_ids: f.combo_item_ids.includes(id)
        ? f.combo_item_ids.filter((x) => x !== id)
        : [...f.combo_item_ids, id],
    }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/admin/kiosk/settings", {
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
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Self-Order Kiosk</p>
          <h1 className="text-2xl font-semibold text-gray-900">Screen</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            How the standing screen looks and behaves. It sells the University Kalba menu.
          </p>
          <a
            href="/kiosk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-orange-600 hover:underline"
          >
            Open the kiosk screen <ExternalLink size={12} />
          </a>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity shrink-0"
          style={{ background: saved ? "#16a34a" : "#ea580c" }}
        >
          <Save size={15} />
          {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
        </button>
      </div>

      <div className="space-y-6">
        {/* ─── Taking orders ─── */}
        <Card title="Taking orders">
          <Toggle
            label="Kiosk is live"
            hint="Off shows a notice instead of the menu, and refuses any order the screen tries to send."
            on={form.is_live}
            onChange={(v) => field("is_live", v)}
          />
          {!form.is_live && (
            <BilingualField
              label="Closed notice"
              value={form.closed_message}
              valueAr={form.closed_message_ar ?? ""}
              onChange={(v) => field("closed_message", v)}
              onChangeAr={(v) => field("closed_message_ar", v as Form["closed_message_ar"])}
              placeholder="The kiosk is closed right now. Please order at the counter."
              multiline
              rows={2}
            />
          )}
        </Card>

        {/* ─── Branding ─── */}
        <Card title="Branding" hint="Shown in the corner of every screen">
          <div className="grid grid-cols-2 gap-3">
            <Text label="Name" value={form.brand_name} onChange={(v) => field("brand_name", v)} placeholder="TWO IN ONE" />
            <Text
              label="Under the name"
              value={form.brand_subtitle}
              onChange={(v) => field("brand_subtitle", v)}
              placeholder="UNIVERSITY KALBA"
            />
          </div>
          <ImageUploadField
            label="Logo"
            hint="transparent PNG · used instead of the name when set"
            value={form.logo_url}
            onChange={(url) => field("logo_url", url)}
            folder="kiosk"
          />
        </Card>

        {/* ─── The idle screen ─── */}
        <Card title="Idle screen" hint="The wording over the ads. Add the ads themselves under Kiosk → Ads.">
          <BilingualField
            label="Order button"
            value={form.order_button_text}
            valueAr={form.order_button_text_ar ?? ""}
            onChange={(v) => field("order_button_text", v)}
            onChangeAr={(v) => field("order_button_text_ar", v as Form["order_button_text_ar"])}
            placeholder="ORDER NOW"
          />
          <BilingualField
            label="Line under the button"
            value={form.touch_hint}
            valueAr={form.touch_hint_ar ?? ""}
            onChange={(v) => field("touch_hint", v)}
            onChangeAr={(v) => field("touch_hint_ar", v as Form["touch_hint_ar"])}
            placeholder="Touch to begin"
          />
          <BilingualField
            label="Privilege Card strip"
            value={form.privilege_strip}
            valueAr={form.privilege_strip_ar ?? ""}
            onChange={(v) => field("privilege_strip", v)}
            onChangeAr={(v) => field("privilege_strip_ar", v as Form["privilege_strip_ar"])}
            placeholder="Privilege Card Members Get 10% OFF"
          />
        </Card>

        {/* ─── The combo ─── */}
        <Card title="Combo banner" hint="The offer across the top of the menu screen">
          <Toggle label="Show the combo" on={form.combo_enabled} onChange={(v) => field("combo_enabled", v)} />

          {form.combo_enabled && (
            <>
              <BilingualField
                label="Title"
                value={form.combo_title}
                valueAr={form.combo_title_ar ?? ""}
                onChange={(v) => field("combo_title", v)}
                onChangeAr={(v) => field("combo_title_ar", v as Form["combo_title_ar"])}
                placeholder="Campus Combo"
              />
              <BilingualField
                label="Subtitle"
                value={form.combo_subtitle}
                valueAr={form.combo_subtitle_ar ?? ""}
                onChange={(v) => field("combo_subtitle", v)}
                onChangeAr={(v) => field("combo_subtitle_ar", v as Form["combo_subtitle_ar"])}
                placeholder="Burger + Fries + Drink"
              />
              <div className="grid grid-cols-2 gap-3">
                <Num label="Price shown (AED)" value={Number(form.combo_price)} onChange={(v) => field("combo_price", v)} />
                <Num label="Saving shown (AED)" value={Number(form.combo_save)} onChange={(v) => field("combo_save", v)} />
              </div>
              <ImageUploadField
                label="Photo"
                hint="600×600px · square"
                value={form.combo_image_url}
                onChange={(url) => field("combo_image_url", url)}
                folder="kiosk"
              />

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  What goes in the basket
                </label>
                {/* The dishes themselves, not a made-up line: the kitchen makes
                    a burger, fries and a drink, and the invoice has to itemise
                    what was actually charged. The price above is only what the
                    banner advertises — each dish still rings up at its own. */}
                <p className="text-[11px] text-gray-500 mb-2">
                  Pressing “Add Combo” drops all of these in at once. Each is charged at its own menu
                  price, so set those to add up to the figure above.
                </p>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {menu.length === 0 ? (
                    <p className="p-3 text-sm text-gray-400">No menu items yet.</p>
                  ) : (
                    menu.map((item) => {
                      const on = form.combo_item_ids.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleComboItem(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${on ? "bg-orange-50" : "hover:bg-gray-50"}`}
                        >
                          <span
                            className={`w-4 h-4 rounded border-2 shrink-0 ${on ? "bg-orange-500 border-orange-500" : "border-gray-300"}`}
                          />
                          <span className="flex-1 text-sm text-gray-800 truncate">{item.name}</span>
                          <span className="text-xs text-gray-500 shrink-0">AED {item.price}</span>
                          {!item.is_active && (
                            <span className="text-[10px] font-semibold text-gray-400 shrink-0">hidden</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-gray-500">
                  {form.combo_item_ids.length} selected
                  {form.combo_item_ids.length === 0 && " — the banner stays hidden until at least one is picked"}
                </p>
              </div>
            </>
          )}
        </Card>

        {/* ─── The flow ─── */}
        <Card title="Checkout steps">
          <Toggle
            label="Ask for a Privilege Card"
            hint="Looks the card up by its member number and applies the card’s own discount."
            on={form.privilege_enabled}
            onChange={(v) => field("privilege_enabled", v)}
          />
          <Toggle
            label="Ask for a phone number"
            hint="Off sends the order straight from Review. The number is always skippable either way."
            on={form.phone_enabled}
            onChange={(v) => field("phone_enabled", v)}
          />
          {form.phone_enabled && (
            <div className="ps-4 border-s-2 border-gray-100 space-y-3">
              <Toggle
                label="Offer an SMS receipt"
                on={form.sms_receipt_enabled}
                onChange={(v) => field("sms_receipt_enabled", v)}
              />
              <Toggle
                label="Offer a WhatsApp receipt"
                on={form.whatsapp_receipt_enabled}
                onChange={(v) => field("whatsapp_receipt_enabled", v)}
              />
            </div>
          )}
        </Card>

        {/* ─── The confirmation ─── */}
        <Card title="Confirmation screen">
          <div className="grid grid-cols-3 gap-3">
            <Text
              label="Order prefix"
              value={form.order_prefix}
              onChange={(v) => field("order_prefix", v.toUpperCase().slice(0, 6))}
              placeholder="TIO"
            />
            <Num label="Ready from (min)" value={form.ready_minutes_min} onChange={(v) => field("ready_minutes_min", v)} />
            <Num label="Ready to (min)" value={form.ready_minutes_max} onChange={(v) => field("ready_minutes_max", v)} />
          </div>
          <p className="-mt-1 text-[11px] text-gray-500">
            The number itself is the order’s own, so “{form.order_prefix || "TIO"}-1048” is order #1048 in
            Order History.
          </p>
          <BilingualField
            label="Where to collect"
            value={form.pickup_counter}
            valueAr={form.pickup_counter_ar ?? ""}
            onChange={(v) => field("pickup_counter", v)}
            onChangeAr={(v) => field("pickup_counter_ar", v as Form["pickup_counter_ar"])}
            placeholder="University Kalba Counter"
          />
        </Card>

        {/* ─── Timers ─── */}
        <Card
          title="Timers"
          hint="What stops the next customer inheriting the last one’s basket. 0 turns a timer off."
        >
          <div className="grid grid-cols-2 gap-3">
            <Num
              label="Clear the confirmation after (sec)"
              value={form.reset_seconds}
              onChange={(v) => field("reset_seconds", v)}
            />
            <Num
              label="Abandon an untouched order after (sec)"
              value={form.idle_timeout_seconds}
              onChange={(v) => field("idle_timeout_seconds", v)}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Small pieces ─────────────────────────────────────────────────────────── */

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        {hint && <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Text({
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

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      <input
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className={inputCls}
      />
    </div>
  );
}

function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="w-full flex items-start gap-3 text-left"
    >
      <span
        className={`mt-0.5 w-10 h-6 rounded-full shrink-0 transition-colors relative ${on ? "bg-orange-500" : "bg-gray-300"}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? "left-[1.125rem]" : "left-0.5"}`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-800">{label}</span>
        {hint && <span className="block text-[11px] text-gray-500 mt-0.5">{hint}</span>}
      </span>
    </button>
  );
}
