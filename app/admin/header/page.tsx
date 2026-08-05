"use client";
import { useEffect, useState } from "react";
import { Save, Type, Image as ImageIcon } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

const HEADER_FIELDS = [
  "header_title",
  "header_title_highlight",
  "header_tagline",
  "header_logo_url",
] as const;

type HeaderForm = Record<(typeof HEADER_FIELDS)[number], string> & { id?: string };

const EMPTY: HeaderForm = {
  header_title: "", header_title_highlight: "", header_tagline: "", header_logo_url: "",
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 transition";

export default function HeaderAdmin() {
  const [form, setForm] = useState<HeaderForm>({ ...EMPTY });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const next: HeaderForm = { ...EMPTY, id: data.id };
        HEADER_FIELDS.forEach((k) => { next[k] = data[k] ?? ""; });
        setForm(next);
        setLoading(false);
      });
  }, []);

  function handleField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    // Only the header fields (+ id) are sent — other settings are untouched.
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Site Header</p>
          <h1 className="text-2xl font-semibold text-gray-900">Header Content</h1>
          <p className="text-sm text-gray-500 mt-0.5">The logo, name and tagline in the top bar of every page</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-70" style={{ background: saved ? "#16a34a" : "#ea580c" }}>
          <Save size={15} />
          {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
        </button>
      </div>

      {/* Live preview — the same two lines the header renders */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 mb-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Preview</p>
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={form.header_logo_url || "/logos/two-in-one.png"}
            alt=""
            className="w-10 h-10 object-contain shrink-0"
          />
          <div className="min-w-0">
            <p className="font-brand text-[14px] font-extrabold leading-none tracking-tight uppercase truncate">
              <span className="text-gray-900">{form.header_title || "TWOINONE"}</span>
              {form.header_title_highlight && (
                <span style={{ color: "#ea580c" }}> {form.header_title_highlight}</span>
              )}
            </p>
            {form.header_tagline && (
              <p className="font-brand text-[9.5px] font-semibold text-gray-400 leading-none mt-1 truncate">
                {form.header_tagline}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Wordmark */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <Type size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Name &amp; Tagline</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Name (dark)</label>
              <input value={form.header_title} onChange={(e) => handleField("header_title", e.target.value)} placeholder="TWOINONE" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Name Highlight (orange)</label>
              <input value={form.header_title_highlight} onChange={(e) => handleField("header_title_highlight", e.target.value)} placeholder="ORDER" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tagline</label>
            <input value={form.header_tagline} onChange={(e) => handleField("header_tagline", e.target.value)} placeholder="Good Food, One Click Away" className={inputCls} />
            <p className="text-[11px] text-gray-400 mt-1.5">Shown small under the name. Leave blank to hide it.</p>
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <ImageIcon size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Logo</h2>
        </div>
        <div className="px-6 py-5">
          <ImageUploadField
            label="Header Logo"
            value={form.header_logo_url}
            onChange={(v) => handleField("header_logo_url", v)}
            folder="header"
            hint="Square works best. Leave blank to use the built-in logo."
          />
        </div>
      </div>

      <p className="text-xs text-gray-400">
        The name is written in two parts so the second half can carry the orange —
        e.g. <span className="font-semibold text-gray-600">TWOINONE</span> +{" "}
        <span className="font-semibold" style={{ color: "#ea580c" }}>ORDER</span>.
      </p>
    </div>
  );
}
