"use client";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import BilingualField from "@/components/admin/BilingualField";

interface CampusPromo {
  id?: string;
  title: string;
  title_ar: string;
  subtitle: string;
  subtitle_ar: string;
  description: string;
  description_ar: string;
  badge: string;
  badge_ar: string;
  image_url: string;
  button_text: string;
  button_text_ar: string;
  perk1: string;
  perk1_ar: string;
  perk2: string;
  perk2_ar: string;
  perk3: string;
  perk3_ar: string;
  is_active: boolean;
}

const DEFAULTS: CampusPromo = {
  title: "Two in One University Kalba",
  title_ar: "",
  subtitle: "Made for Students, Loved by Everyone!",
  subtitle_ar: "",
  description: "Student-friendly prices · Fresh food · Free WiFi",
  description_ar: "",
  badge: "🎓 On Campus",
  badge_ar: "",
  image_url: "",
  button_text: "View Menu",
  button_text_ar: "",
  perk1: "Student Prices", perk1_ar: "",
  perk2: "Free WiFi", perk2_ar: "",
  perk3: "Open Late", perk3_ar: "",
  is_active: true,
};


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
            <BilingualField
              label="Badge (top label)"
              value={form.badge}
              valueAr={form.badge_ar ?? ""}
              onChange={(v) => set("badge", v)}
              onChangeAr={(v) => set("badge_ar", v)}
              placeholder="🎓 On Campus"
            />
          </div>

          <div>
            <BilingualField
              label="Title"
              value={form.title}
              valueAr={form.title_ar ?? ""}
              onChange={(v) => set("title", v)}
              onChangeAr={(v) => set("title_ar", v)}
              placeholder="Two in One University Kalba"
            />
          </div>

          <div>
            <BilingualField
              label="Subtitle (orange highlight line)"
              value={form.subtitle}
              valueAr={form.subtitle_ar ?? ""}
              onChange={(v) => set("subtitle", v)}
              onChangeAr={(v) => set("subtitle_ar", v)}
              placeholder="Made for Students, Loved by Everyone!"
            />
          </div>

          <div>
            <BilingualField
              label="Description"
              value={form.description}
              valueAr={form.description_ar ?? ""}
              onChange={(v) => set("description", v)}
              onChangeAr={(v) => set("description_ar", v)}
              placeholder="Student-friendly prices · Fresh food · Free WiFi"
            />
          </div>

          <div>
            <BilingualField
              label="Button Text"
              value={form.button_text}
              valueAr={form.button_text_ar ?? ""}
              onChange={(v) => set("button_text", v)}
              onChangeAr={(v) => set("button_text_ar", v)}
              placeholder="View Menu"
            />
          </div>
        </div>

        {/* Perk chips */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Perk Chips (3 highlights)</h2>
          {(["perk1", "perk2", "perk3"] as const).map((key, i) => (
            <BilingualField
              key={key}
              label={`Perk ${i + 1}`}
              value={form[key]}
              valueAr={form[`${key}_ar` as const] ?? ""}
              onChange={(v) => set(key, v)}
              onChangeAr={(v) => set(`${key}_ar` as keyof CampusPromo, v)}
              placeholder={["Student Prices", "Free WiFi", "Open Late"][i]}
            />
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
