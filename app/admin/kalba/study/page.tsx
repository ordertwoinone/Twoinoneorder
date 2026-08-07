"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import BilingualField from "@/components/admin/BilingualField";

interface StudyFeature {
  icon: string;
  label: string;
  /* Arabic sits beside its English twin so the pair can never drift apart. */
  label_ar?: string;
}

interface KalbaStudy {
  id?: string;
  title: string;
  title_ar: string;
  subtitle: string;
  subtitle_ar: string;
  image_url: string;
  button_text: string;
  button_text_ar: string;
  features: StudyFeature[];
}

const DEFAULTS: KalbaStudy = {
  title: "Study & Chill",
  title_ar: "",
  subtitle: "The perfect place to eat, study and hangout.",
  subtitle_ar: "",
  image_url: "",
  button_text: "Visit Store",
  button_text_ar: "",
  features: [],
};

const ICON_OPTIONS = [
  "Wifi", "BatteryCharging", "Armchair", "Users", "MoonStar",
  "Clock", "Star", "GraduationCap", "Coffee", "BookOpen", "Zap", "Music",
];


export default function KalbaStudyAdmin() {
  const [form, setForm] = useState<KalbaStudy>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/kalba/study")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setForm({ ...data, features: Array.isArray(data.features) ? data.features : [] });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function handleField(key: keyof KalbaStudy, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function handleFeature(index: number, key: keyof StudyFeature, value: string) {
    setForm((f) => ({
      ...f,
      features: f.features.map((x, i) => (i === index ? { ...x, [key]: value } : x)),
    }));
    setSaved(false);
  }

  function addFeature() {
    setForm((f) => ({ ...f, features: [...f.features, { icon: "Star", label: "" }] }));
    setSaved(false);
  }

  function removeFeature(index: number) {
    setForm((f) => ({ ...f, features: f.features.filter((_, i) => i !== index) }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/kalba/study", {
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
          <h1 className="text-2xl font-semibold text-gray-900">Study &amp; Chill</h1>
          <p className="text-sm text-gray-500 mt-0.5">Card with photo and amenity icons</p>
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
          <h2 className="text-sm font-semibold text-gray-700">Text</h2>
          <div>
            <BilingualField
              label="Title"
              value={form.title}
              valueAr={form.title_ar ?? ""}
              onChange={(v) => handleField("title", v)}
              onChangeAr={(v) => handleField("title_ar", v)}
              placeholder="Study & Chill"
            />
          </div>
          <div>
            <BilingualField
              label="Subtitle"
              value={form.subtitle}
              valueAr={form.subtitle_ar ?? ""}
              onChange={(v) => handleField("subtitle", v)}
              onChangeAr={(v) => handleField("subtitle_ar", v)}
              placeholder="The perfect place to eat, study and hangout."
            />
          </div>
          <div>
            <BilingualField
              label="Button Text"
              value={form.button_text}
              valueAr={form.button_text_ar ?? ""}
              onChange={(v) => handleField("button_text", v)}
              onChangeAr={(v) => handleField("button_text_ar", v)}
              placeholder="Visit Store"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Photo</h2>
          <ImageUploadField
            label="Photo (left side of the card)"
            value={form.image_url}
            onChange={(url) => handleField("image_url", url)}
            folder="kalba"
            hint="1200×900px · landscape"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Amenities</h2>
            <button type="button" onClick={addFeature}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-orange-600 border border-orange-200 hover:bg-orange-50 transition-colors">
              <Plus size={13} /> Add amenity
            </button>
          </div>
          {form.features.length === 0 ? (
            <p className="text-sm text-gray-400">No amenities yet. Add one above.</p>
          ) : (
            <div className="space-y-3">
              {form.features.map((feature, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <select value={feature.icon} onChange={(e) => handleFeature(i, "icon", e.target.value)}
                    className="w-44 px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                    {ICON_OPTIONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                  </select>
                  <div className="flex-1 space-y-1.5">
                    <input type="text" value={feature.label} onChange={(e) => handleFeature(i, "label", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Free WiFi" />
                    <input type="text" value={feature.label_ar ?? ""} onChange={(e) => handleFeature(i, "label_ar", e.target.value)}
                      dir="rtl" lang="ar" style={{ fontFamily: "var(--font-ar), inherit" }}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-orange-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="بالعربية (اختياري)" />
                  </div>
                  <button type="button" onClick={() => removeFeature(i)}
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
