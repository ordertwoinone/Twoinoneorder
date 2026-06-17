"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";

interface HourRow { label: string; time: string; }
interface About {
  id?: string;
  about_title: string;
  about_text: string;
  location: string;
  hours: HourRow[];
  cuisines: string[];
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
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title</label>
          <input value={form.about_title} onChange={(e) => set("about_title", e.target.value)} className={inputCls} placeholder="About Buffet By Two In One" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
          <textarea value={form.about_text} onChange={(e) => set("about_text", e.target.value)} rows={4} className={`${inputCls} resize-y`} placeholder="Tell customers about the buffet…" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location</label>
          <input value={form.location} onChange={(e) => set("location", e.target.value)} className={inputCls} placeholder="Near University City, Kalba" />
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
              <div key={i} className="flex gap-2">
                <input value={h.label} onChange={(e) => set("hours", form.hours.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className={`${inputCls} w-1/3`} placeholder="Sat – Thu" />
                <input value={h.time} onChange={(e) => set("hours", form.hours.map((x, j) => j === i ? { ...x, time: e.target.value } : x))} className={inputCls} placeholder="12:00 PM – 11:30 PM" />
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
            <button onClick={() => set("cuisines", [...form.cuisines, ""])} className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700">
              <Plus size={13} /> Add cuisine
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.cuisines.map((c, i) => (
              <div key={i} className="flex items-center gap-1 bg-gray-50 rounded-lg pl-2 pr-1 py-1">
                <input value={c} onChange={(e) => set("cuisines", form.cuisines.map((x, j) => j === i ? e.target.value : x))} className="bg-transparent text-sm w-28 focus:outline-none" placeholder="Arabic" />
                <button onClick={() => set("cuisines", form.cuisines.filter((_, j) => j !== i))} className="w-6 h-6 rounded-md hover:bg-red-50 flex items-center justify-center">
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
