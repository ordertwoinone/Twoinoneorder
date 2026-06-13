"use client";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

interface CampusPromo {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  image_url: string;
  button_text: string;
  perk1: string;
  perk2: string;
  perk3: string;
  is_active: boolean;
}

const DEFAULTS: CampusPromo = {
  title: "Two in One University Kalba",
  subtitle: "Made for Students, Loved by Everyone!",
  description: "Student-friendly prices · Fresh food · Free WiFi",
  badge: "🎓 On Campus",
  image_url: "",
  button_text: "View Menu",
  perk1: "Student Prices",
  perk2: "Free WiFi",
  perk3: "Open Late",
  is_active: true,
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function CampusPromoAdmin() {
  const [form, setForm] = useState<CampusPromo>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/campus-promo")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setForm({ ...DEFAULTS, ...data });
      })
      .finally(() => setLoading(false));
  }, []);

  function set(key: keyof CampusPromo, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/campus-promo", {
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
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">
            Homepage Section
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">
            Campus Promo Card
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            The University Kalba highlight shown on the home page
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
          style={{ background: saved ? "#16a34a" : "#ea580c" }}
        >
          <Save size={15} />
          {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
        </button>
      </div>

      <div className="space-y-5">
        {/* Visibility */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set("is_active", !form.is_active)}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                form.is_active ? "bg-orange-500" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.is_active ? "translate-x-4" : ""
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {form.is_active ? "Visible on homepage" : "Hidden from homepage"}
              </p>
              <p className="text-xs text-gray-400">Toggle to show or hide this section</p>
            </div>
          </label>
        </div>

        {/* Text content */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Text Content</h2>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Badge (top label)
            </label>
            <input
              type="text"
              value={form.badge}
              onChange={(e) => set("badge", e.target.value)}
              className={inputCls}
              placeholder="🎓 On Campus"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={inputCls}
              placeholder="Two in One University Kalba"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Subtitle (orange highlight line)
            </label>
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
              className={inputCls}
              placeholder="Made for Students, Loved by Everyone!"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={inputCls}
              placeholder="Student-friendly prices · Fresh food · Free WiFi"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Button Text
            </label>
            <input
              type="text"
              value={form.button_text}
              onChange={(e) => set("button_text", e.target.value)}
              className={inputCls}
              placeholder="View Menu"
            />
          </div>
        </div>

        {/* Perk chips */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Perk Chips (3 highlights)</h2>
          {(["perk1", "perk2", "perk3"] as const).map((key, i) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Perk {i + 1}
              </label>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                className={inputCls}
                placeholder={["Student Prices", "Free WiFi", "Open Late"][i]}
              />
            </div>
          ))}
        </div>

        {/* Image */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Background / Feature Image
          </h2>
          <ImageUploadField
            label="Image (right side of card)"
            value={form.image_url}
            onChange={(url) => set("image_url", url)}
            folder="campus-promo"
            hint="1200×600px recommended"
          />
        </div>
      </div>
    </div>
  );
}
