"use client";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

interface StudyFeature {
  icon: string;
  label: string;
}

interface KalbaStudy {
  id?: string;
  title: string;
  subtitle: string;
  image_url: string;
  button_text: string;
  features: StudyFeature[];
}

const DEFAULTS: KalbaStudy = {
  title: "Study & Chill",
  subtitle: "The perfect place to eat, study and hangout.",
  image_url: "",
  button_text: "Visit Store",
  features: [],
};

const ICON_OPTIONS = [
  "Wifi", "BatteryCharging", "Armchair", "Users", "MoonStar",
  "Clock", "Star", "GraduationCap", "Coffee", "BookOpen", "Zap", "Music",
];

const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

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
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title</label>
            <input type="text" value={form.title} onChange={(e) => handleField("title", e.target.value)} className={inputCls} placeholder="Study & Chill" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subtitle</label>
            <input type="text" value={form.subtitle} onChange={(e) => handleField("subtitle", e.target.value)} className={inputCls} placeholder="The perfect place to eat, study and hangout." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Button Text</label>
            <input type="text" value={form.button_text} onChange={(e) => handleField("button_text", e.target.value)} className={inputCls} placeholder="Visit Store" />
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
                  <input type="text" value={feature.label} onChange={(e) => handleFeature(i, "label", e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Free WiFi" />
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
