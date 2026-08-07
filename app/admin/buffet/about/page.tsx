"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import BilingualField from "@/components/admin/BilingualField";

/* Arabic sits beside its English twin so the pair can never drift apart. */
interface HourRow { label: string; time: string; label_ar?: string; time_ar?: string; }
interface About {
  id?: string;
  about_title: string;
  about_title_ar: string;
  about_text: string;
  about_text_ar: string;
  location: string;
  location_ar: string;
  hours: HourRow[];
  cuisines: string[];
  /** Index-matched to `cuisines`; the editor adds and removes both together. */
  cuisines_ar: string[];
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function BuffetAboutAdmin() {
  const [form, setForm] = useState<About | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/buffet/about", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setForm({
          ...d,
          hours: Array.isArray(d.hours) ? d.hours : [],
          cuisines: Array.isArray(d.cuisines) ? d.cuisines : [],
          cuisines_ar: Array.isArray(d.cuisines_ar) ? d.cuisines_ar : [],
        });
        setLoading(false);
      });
  }, []);

  function set<K extends keyof About>(key: K, value: About[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    await fetch("/api/admin/buffet/about", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading || !form) {
    return <div className="p-8 text-sm text-gray-400">Loading…</div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Buffet Page</p>
          <h1 className="text-2xl font-semibold text-gray-900">About Tab</h1>
          <p className="text-sm text-gray-500 mt-0.5">The content shown under the “About” tab</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-70" style={{ background: saved ? "#16a34a" : "#ea580c" }}>
          <Save size={15} /> {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 space-y-5">
        <div>
          <BilingualField
            label="Title"
            value={form.about_title}
            valueAr={form.about_title_ar ?? ""}
            onChange={(v) => set("about_title", v)}
            onChangeAr={(v) => set("about_title_ar", v)}
            placeholder="About Buffet By Two In One"
          />
        </div>
        <div>
          <BilingualField
            label="Description"
            value={form.about_text}
            valueAr={form.about_text_ar ?? ""}
            onChange={(v) => set("about_text", v)}
            onChangeAr={(v) => set("about_text_ar", v)}
            placeholder="Tell customers about the buffet…"
            multiline
            rows={4}
          />
        </div>
        <div>
          <BilingualField
            label="Location"
            value={form.location}
            valueAr={form.location_ar ?? ""}
            onChange={(v) => set("location", v)}
            onChangeAr={(v) => set("location_ar", v)}
            placeholder="Near University City, Kalba"
          />
        </div>

        {/* Hours */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-gray-700">Opening Hours</label>
            <button onClick={() => set("hours", [...form.hours, { label: "", time: "" }])} className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700">
              <Plus size={13} /> Add row
            </button>
          </div>
          <div className="space-y-2">
            {form.hours.map((h, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="w-1/3 space-y-1.5">
                  <input value={h.label} onChange={(e) => set("hours", form.hours.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className={inputCls} placeholder="Sat – Thu" />
                  <input value={h.label_ar ?? ""} onChange={(e) => set("hours", form.hours.map((x, j) => j === i ? { ...x, label_ar: e.target.value } : x))} dir="rtl" lang="ar" style={{ fontFamily: "var(--font-ar), inherit" }} className={`${inputCls} bg-orange-50/30`} placeholder="السبت – الخميس" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <input value={h.time} onChange={(e) => set("hours", form.hours.map((x, j) => j === i ? { ...x, time: e.target.value } : x))} className={inputCls} placeholder="12:00 PM – 11:30 PM" />
                  <input value={h.time_ar ?? ""} onChange={(e) => set("hours", form.hours.map((x, j) => j === i ? { ...x, time_ar: e.target.value } : x))} dir="rtl" lang="ar" style={{ fontFamily: "var(--font-ar), inherit" }} className={`${inputCls} bg-orange-50/30`} placeholder="بالعربية (اختياري)" />
                </div>
                <button onClick={() => set("hours", form.hours.filter((_, j) => j !== i))} className="w-9 h-9 shrink-0 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center">
                  <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                </button>
              </div>
            ))}
            {form.hours.length === 0 && <p className="text-xs text-gray-400">No hours added.</p>}
          </div>
        </div>

        {/* Cuisines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-gray-700">Cuisine Types</label>
            <button onClick={() => { set("cuisines", [...form.cuisines, ""]); set("cuisines_ar", [...form.cuisines_ar, ""]); }} className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700">
              <Plus size={13} /> Add cuisine
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.cuisines.map((c, i) => (
              <div key={i} className="flex items-center gap-1 bg-gray-50 rounded-lg ps-2 pe-1 py-1">
                <div className="space-y-1">
                  <input value={c} onChange={(e) => set("cuisines", form.cuisines.map((x, j) => j === i ? e.target.value : x))} className="bg-transparent text-sm w-28 focus:outline-none" placeholder="Arabic" />
                  <input value={form.cuisines_ar[i] ?? ""} onChange={(e) => set("cuisines_ar", Array.from({ length: form.cuisines.length }, (_, j) => (j === i ? e.target.value : form.cuisines_ar[j] ?? "")))} dir="rtl" lang="ar" style={{ fontFamily: "var(--font-ar), inherit" }} className="bg-transparent text-sm w-28 focus:outline-none border-t border-gray-200 pt-1" placeholder="بالعربية" />
                </div>
                <button onClick={() => { set("cuisines", form.cuisines.filter((_, j) => j !== i)); set("cuisines_ar", form.cuisines_ar.filter((_, j) => j !== i)); }} className="w-6 h-6 rounded-md hover:bg-red-50 flex items-center justify-center">
                  <Trash2 size={12} className="text-gray-400 hover:text-red-500" />
                </button>
              </div>
            ))}
            {form.cuisines.length === 0 && <p className="text-xs text-gray-400">No cuisines added.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
