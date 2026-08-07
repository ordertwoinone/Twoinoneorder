"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import BilingualField from "@/components/admin/BilingualField";

interface Chip {
  emoji: string;
  line1: string;
  line2: string;
  /* Arabic sits beside its English twin so the pair can never drift apart. */
  line1_ar?: string;
  line2_ar?: string;
}

interface KalbaBanner {
  id?: string;
  title: string;
  title_ar: string;
  title_highlight: string;
  title_highlight_ar: string;
  subtitle: string;
  subtitle_ar: string;
  image_url: string;
  chips: Chip[];
}

const DEFAULTS: KalbaBanner = {
  title: "Made for Students,",
  title_ar: "",
  title_highlight: "Loved by Everyone!",
  title_highlight_ar: "",
  subtitle: "Great food. Better prices. Right on campus.",
  subtitle_ar: "",
  image_url: "",
  chips: [],
};


export default function KalbaBannerAdmin() {
  const [form, setForm] = useState<KalbaBanner>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/kalba/banner")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setForm({ ...data, chips: Array.isArray(data.chips) ? data.chips : [] });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function handleField(key: keyof KalbaBanner, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function handleChip(index: number, key: keyof Chip, value: string) {
    setForm((f) => ({
      ...f,
      chips: f.chips.map((c, i) => (i === index ? { ...c, [key]: value } : c)),
    }));
    setSaved(false);
  }

  function addChip() {
    setForm((f) => ({ ...f, chips: [...f.chips, { emoji: "⭐", line1: "", line2: "" }] }));
    setSaved(false);
  }

  function removeChip(index: number) {
    setForm((f) => ({ ...f, chips: f.chips.filter((_, i) => i !== index) }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/kalba/banner", {
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
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">University Kalba Page</p>
          <h1 className="text-2xl font-semibold text-gray-900">Hero Banner</h1>
          <p className="text-sm text-gray-500 mt-0.5">Big banner with headline, info chips and photo</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
          style={{ background: saved ? "#16a34a" : "#ea580c" }}
        >
          <Save size={15} />
          {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Headline</h2>
          <div>
            <BilingualField
              label="Title (first line)"
              value={form.title}
              valueAr={form.title_ar ?? ""}
              onChange={(v) => handleField("title", v)}
              onChangeAr={(v) => handleField("title_ar", v)}
              placeholder="Made for Students,"
            />
          </div>
          <div>
            <BilingualField
              label="Title Highlight (orange second line)"
              value={form.title_highlight}
              valueAr={form.title_highlight_ar ?? ""}
              onChange={(v) => handleField("title_highlight", v)}
              onChangeAr={(v) => handleField("title_highlight_ar", v)}
              placeholder="Loved by Everyone!"
            />
          </div>
          <div>
            <BilingualField
              label="Subtitle"
              value={form.subtitle}
              valueAr={form.subtitle_ar ?? ""}
              onChange={(v) => handleField("subtitle", v)}
              onChangeAr={(v) => handleField("subtitle_ar", v)}
              placeholder="Great food. Better prices. Right on campus."
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Banner Photo</h2>
          <ImageUploadField
            label="Photo (right side of the banner)"
            value={form.image_url}
            onChange={(url) => handleField("image_url", url)}
            folder="kalba"
            hint="1200×800px · landscape"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Info Chips</h2>
            <button type="button" onClick={addChip}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-orange-600 border border-orange-200 hover:bg-orange-50 transition-colors">
              <Plus size={13} /> Add chip
            </button>
          </div>
          {form.chips.length === 0 ? (
            <p className="text-sm text-gray-400">No chips yet. Add one above.</p>
          ) : (
            <div className="space-y-3">
              {form.chips.map((chip, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input type="text" value={chip.emoji} onChange={(e) => handleChip(i, "emoji", e.target.value)}
                    className="w-14 px-2 py-2.5 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="🎓" />
                  {/* English above, Arabic below. Blank Arabic falls back. */}
                  <div className="flex-1 space-y-1.5">
                    <input type="text" value={chip.line1} onChange={(e) => handleChip(i, "line1", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Top line (e.g. Breakfast from)" />
                    <input type="text" value={chip.line1_ar ?? ""} onChange={(e) => handleChip(i, "line1_ar", e.target.value)}
                      dir="rtl" lang="ar" style={{ fontFamily: "var(--font-ar), inherit" }}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-orange-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="السطر العلوي (اختياري)" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input type="text" value={chip.line2} onChange={(e) => handleChip(i, "line2", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Bold line (e.g. AED 5)" />
                    <input type="text" value={chip.line2_ar ?? ""} onChange={(e) => handleChip(i, "line2_ar", e.target.value)}
                      dir="rtl" lang="ar" style={{ fontFamily: "var(--font-ar), inherit" }}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-orange-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="السطر الغامق (اختياري)" />
                  </div>
                  <button type="button" onClick={() => removeChip(i)}
                    className="w-9 h-9 mt-0.5 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
