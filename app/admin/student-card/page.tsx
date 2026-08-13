"use client";
import { useEffect, useState } from "react";
import { Save, Type, Palette, Sparkles, RotateCcw, CreditCard } from "lucide-react";
import PrivilegeCard from "@/components/account/PrivilegeCard";
import {
  CARD_TEXT_DEFAULTS,
  DEFAULT_CARD_DESIGN,
  type StudentCardDesign,
} from "@/lib/student-card-design";

/**
 * admin → Student Card.
 *
 * The card itself is the preview: the same component the account screens draw,
 * fed straight from the form. What is on screen here is exactly what a student
 * gets, so there is no second drawing of it to keep in step.
 */

type Form = StudentCardDesign & { id?: string };

const TEXT_FIELDS: { key: keyof StudentCardDesign; label: string }[] = [
  { key: "brand_line1", label: "Brand line 1" },
  { key: "brand_line2", label: "Brand line 2" },
  { key: "brand_accent", label: "Brand accent word" },
  { key: "cafe_line", label: "Under the brand" },
  { key: "tagline", label: "Tagline" },
  { key: "title_line1", label: "Card title line 1" },
  { key: "title_line2", label: "Card title line 2" },
  { key: "issuer", label: "Issuer tab" },
  { key: "member_id_label", label: "Member ID label" },
  { key: "valid_thru_label", label: "Valid thru label" },
  { key: "discount_line1", label: "Discount line 1" },
  { key: "discount_line2", label: "Discount line 2" },
  { key: "academic_year_label", label: "Academic year line" },
];

const COLOR_FIELDS: { key: keyof StudentCardDesign; label: string; hint: string }[] = [
  { key: "accent_color", label: "Accent", hint: "Brand word, title, the % and the engraving" },
  { key: "text_color", label: "Text", hint: "Brand, title line 2, the number's neighbours" },
  { key: "muted_color", label: "Muted text", hint: "Field labels and the discount caption" },
  { key: "tagline_color", label: "Tagline", hint: "The small line under the brand" },
  { key: "number_color", label: "Card number", hint: "The long number across the middle" },
  { key: "bg_from", label: "Background — top left", hint: "Where the card's gradient starts" },
  { key: "bg_via", label: "Background — middle", hint: "The colour it passes through" },
  { key: "bg_to", label: "Background — bottom right", hint: "Where it ends" },
  { key: "tab_bg_color", label: "Issuer tab", hint: "The block in the top corner" },
  { key: "tab_text_color", label: "Issuer tab text", hint: "Wording and glyph inside that block" },
];

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function StudentCardDesignAdmin() {
  const [form, setForm] = useState<Form>({ ...DEFAULT_CARD_DESIGN });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  /* The table arrives with a hand-run migration. Without it the form would look
     like it works and save nowhere, so say so instead. */
  const [tableReady, setTableReady] = useState(true);

  useEffect(() => {
    fetch("/api/admin/student-card-design")
      .then((r) => r.json())
      .then((data) => {
        setForm({ ...DEFAULT_CARD_DESIGN, ...data });
        setTableReady(Boolean(data?.id));
        setLoading(false);
      });
  }, []);

  function set(key: keyof StudentCardDesign, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/admin/student-card-design", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setTableReady(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading card design...
      </div>
    );
  }

  const Section = ({
    icon: Icon,
    title,
    children,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50">
        <Icon size={16} className="text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">
            Student Privilege Card
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">Card Design</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Every word and colour on the card students carry
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

      {!tableReady && (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-5">
          Run <code className="font-mono">supabase/student_card_design.sql</code> in the Supabase SQL
          editor before saving — there is nowhere to store the design until then.
        </p>
      )}

      {/* Live preview — the same component the account screens draw. */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-5 mb-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Preview</p>
        <div className="max-w-lg">
          <PrivilegeCard design={form} />
        </div>
        <p className="text-[11px] text-gray-400 mt-3">
          Shown as blank stock. A real card carries the student&apos;s number, name and year in the
          same places.
        </p>
      </div>

      <Section icon={Type} title="Wording">
        <p className="text-xs text-gray-400 -mt-1">
          Leave a field blank to print the wording that ships with the site — shown in grey as the
          placeholder. The academic year line puts the student&apos;s year wherever you write{" "}
          <code className="font-mono text-[11px]">{"{year}"}</code>.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {TEXT_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
              <input
                type="text"
                value={(form[key] as string) ?? ""}
                onChange={(e) => set(key, e.target.value)}
                placeholder={CARD_TEXT_DEFAULTS[key]}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Palette} title="Colours">
        <div className="grid sm:grid-cols-2 gap-4">
          {COLOR_FIELDS.map(({ key, label, hint }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(form[key] as string) || "#000000"}
                  onChange={(e) => set(key, e.target.value)}
                  aria-label={`${label} colour`}
                  className="w-10 h-10 rounded-lg border border-gray-200 bg-white p-1 cursor-pointer shrink-0"
                />
                {/* Typed as well as picked — a brand hex is usually pasted. */}
                <input
                  type="text"
                  value={(form[key] as string) ?? ""}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={DEFAULT_CARD_DESIGN[key] as string}
                  className={`${inputCls} font-mono`}
                />
                <button
                  type="button"
                  onClick={() => set(key, DEFAULT_CARD_DESIGN[key] as string)}
                  aria-label={`Reset ${label} to default`}
                  title="Back to the original colour"
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors shrink-0"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Sparkles} title="Decoration">
        <Switch
          label="Campus building engraving"
          hint="The large faded building printed behind the discount."
          checked={form.show_engraving}
          onChange={(v) => set("show_engraving", v)}
        />
        <Switch
          label="Guilloche waves"
          hint="The fine wave pattern printed above the card number."
          checked={form.show_waves}
          onChange={(v) => set("show_waves", v)}
        />
      </Section>

      <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-8">
        <CreditCard size={13} />
        The discount percentage is set per card when it is issued, not here.
      </div>
    </div>
  );
}

function Switch({
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
        <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{hint}</p>
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
