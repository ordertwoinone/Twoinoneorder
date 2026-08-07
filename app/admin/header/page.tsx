"use client";
import { useEffect, useState } from "react";
import { Save, Type, Image as ImageIcon } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import BilingualField from "@/components/admin/BilingualField";

const HEADER_FIELDS = [
  "header_title",
  "header_title_ar",
  "header_title_highlight",
  "header_title_highlight_ar",
  "header_tagline",
  "header_tagline_ar",
  "header_logo_url",
] as const;

/* Kept apart from HEADER_FIELDS because it is a boolean, not text. */
type HeaderForm = Record<(typeof HEADER_FIELDS)[number], string> & {
  id?: string;
  header_logo_enabled: boolean;
};

const EMPTY: HeaderForm = {
  header_title: "", header_title_ar: "",
  header_title_highlight: "", header_title_highlight_ar: "",
  header_tagline: "", header_tagline_ar: "",
  header_logo_url: "",
  header_logo_enabled: true,
};


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
        // Missing column (migration not run) reads as "shown", matching the site.
        next.header_logo_enabled = data.header_logo_enabled !== false;
        setForm(next);
        setLoading(false);
      });
  }, []);

  function handleField(key: string, value: string | boolean) {
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
          {form.header_logo_enabled && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.header_logo_url || "/logos/two-in-one.png"}
              alt=""
              className="w-10 h-10 object-contain shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="font-brand text-[14px] font-extrabold leading-none tracking-tight truncate">
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
              <BilingualField
                label="Name (dark)"
                value={form.header_title}
                valueAr={form.header_title_ar ?? ""}
                onChange={(v) => handleField("header_title", v)}
                onChangeAr={(v) => handleField("header_title_ar", v)}
                placeholder="TWOINONE"
              />
            </div>
            <div>
              <BilingualField
                label="Name Highlight (orange)"
                value={form.header_title_highlight}
                valueAr={form.header_title_highlight_ar ?? ""}
                onChange={(v) => handleField("header_title_highlight", v)}
                onChangeAr={(v) => handleField("header_title_highlight_ar", v)}
                placeholder="ORDER"
              />
            </div>
          </div>
          <div>
            <BilingualField
              label="Tagline"
              value={form.header_tagline}
              valueAr={form.header_tagline_ar ?? ""}
              onChange={(v) => handleField("header_tagline", v)}
              onChangeAr={(v) => handleField("header_tagline_ar", v)}
              placeholder="Good Food, One Click Away"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">Shown small under the name. Leave blank to hide it. The header prints the name exactly as typed — type it in capitals if you want capitals.</p>
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <ImageIcon size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Logo</h2>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Show / hide. The uploaded image is kept either way, so switching
              it back on does not mean uploading again. */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-700">Show logo in the header</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Off hides the mark on every page and the name moves to the start of the bar.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.header_logo_enabled}
              onClick={() => handleField("header_logo_enabled", !form.header_logo_enabled)}
              className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${
                form.header_logo_enabled ? "bg-orange-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
                  form.header_logo_enabled ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

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
