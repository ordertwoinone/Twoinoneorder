"use client";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import BilingualField from "@/components/admin/BilingualField";

interface KalbaHero {
  id?: string;
  name: string;
  name_ar: string;
  location: string;
  location_ar: string;
  maps_url: string;
  whatsapp: string;
  rating: string;
  rating_count: string;
  rating_count_ar: string;
  delivery_time: string;
  delivery_time_ar: string;
  delivery_fee: string;
  delivery_fee_ar: string;
  is_open: boolean;
  closes_at: string;
  closes_at_ar: string;
  student_title: string;
  student_title_ar: string;
  student_subtitle: string;
  student_subtitle_ar: string;
  student_button: string;
  student_button_ar: string;
  logo_url: string;
}

const DEFAULTS: KalbaHero = {
  name: "Two in One University Kalba",
  name_ar: "",
  location: "Near University of Kalba, Kalba",
  location_ar: "",
  maps_url: "https://www.google.com/maps/search/?api=1&query=University+City+Kalba+Sharjah",
  whatsapp: "971522305216",
  rating: "4.6",
  rating_count: "500+",
  rating_count_ar: "",
  delivery_time: "15–25 min",
  delivery_time_ar: "",
  delivery_fee: "Free delivery",
  delivery_fee_ar: "",
  is_open: true,
  closes_at: "12:00 AM",
  closes_at_ar: "",
  student_title: "Are you a student?",
  student_title_ar: "",
  student_subtitle: "Unlock exclusive student deals & discounts",
  student_subtitle_ar: "",
  student_button: "Verify Student",
  student_button_ar: "",
  logo_url: "",
};

const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function KalbaInfoAdmin() {
  const [form, setForm] = useState<KalbaHero>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/kalba/hero")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setForm(data);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleField(key: keyof KalbaHero, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/kalba/hero", {
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
          <h1 className="text-2xl font-semibold text-gray-900">Branch Info</h1>
          <p className="text-sm text-gray-500 mt-0.5">Header, contact and student banner of the University Kalba page</p>
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
        {/* Logo */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Branch Logo</h2>
          <ImageUploadField
            label="Logo (circular badge shown in branch header)"
            value={form.logo_url}
            onChange={(url) => handleField("logo_url", url)}
            folder="general"
            hint="Recommended: square image, min 200×200px"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Branch Info</h2>
          <div>
            <BilingualField
              label="Branch Name"
              value={form.name}
              valueAr={form.name_ar ?? ""}
              onChange={(v) => handleField("name", v)}
              onChangeAr={(v) => handleField("name_ar", v)}
              placeholder="Two in One University Kalba"
            />
          </div>
          <div>
            <BilingualField
              label="Location Label"
              value={form.location}
              valueAr={form.location_ar ?? ""}
              onChange={(v) => handleField("location", v)}
              onChangeAr={(v) => handleField("location_ar", v)}
              placeholder="Near University of Kalba, Kalba"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Google Maps URL</label>
            <input type="text" value={form.maps_url} onChange={(e) => handleField("maps_url", e.target.value)} className={inputCls} placeholder="https://www.google.com/maps/..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">WhatsApp Number (digits only, with country code)</label>
            <input type="text" value={form.whatsapp} onChange={(e) => handleField("whatsapp", e.target.value)} className={inputCls} placeholder="971522305216" />
            <p className="text-[11px] text-gray-400 mt-1">All Order Now / Verify Student buttons open a WhatsApp chat to this number.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Ratings & Delivery</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rating</label>
              <input type="text" value={form.rating} onChange={(e) => handleField("rating", e.target.value)} className={inputCls} placeholder="4.6" />
            </div>
            <div>
              <BilingualField
                label="Rating Count"
                value={form.rating_count}
                valueAr={form.rating_count_ar ?? ""}
                onChange={(v) => handleField("rating_count", v)}
                onChangeAr={(v) => handleField("rating_count_ar", v)}
                placeholder="500+"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <BilingualField
                label="Delivery Time"
                value={form.delivery_time}
                valueAr={form.delivery_time_ar ?? ""}
                onChange={(v) => handleField("delivery_time", v)}
                onChangeAr={(v) => handleField("delivery_time_ar", v)}
                placeholder="15–25 min"
              />
            </div>
            <div>
              <BilingualField
                label="Delivery Fee"
                value={form.delivery_fee}
                valueAr={form.delivery_fee_ar ?? ""}
                onChange={(v) => handleField("delivery_fee", v)}
                onChangeAr={(v) => handleField("delivery_fee_ar", v)}
                placeholder="Free delivery"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Open Status</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => handleField("is_open", true)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${form.is_open ? "border-green-400 bg-green-50 text-green-700" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                  Open
                </button>
                <button type="button" onClick={() => handleField("is_open", false)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${!form.is_open ? "border-red-400 bg-red-50 text-red-600" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                  Closed
                </button>
              </div>
            </div>
            <div>
              <BilingualField
                label="Closes At"
                value={form.closes_at}
                valueAr={form.closes_at_ar ?? ""}
                onChange={(v) => handleField("closes_at", v)}
                onChangeAr={(v) => handleField("closes_at_ar", v)}
                placeholder="12:00 AM"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Student Banner (bottom of page)</h2>
          <div>
            <BilingualField
              label="Title"
              value={form.student_title}
              valueAr={form.student_title_ar ?? ""}
              onChange={(v) => handleField("student_title", v)}
              onChangeAr={(v) => handleField("student_title_ar", v)}
              placeholder="Are you a student?"
            />
          </div>
          <div>
            <BilingualField
              label="Subtitle"
              value={form.student_subtitle}
              valueAr={form.student_subtitle_ar ?? ""}
              onChange={(v) => handleField("student_subtitle", v)}
              onChangeAr={(v) => handleField("student_subtitle_ar", v)}
              placeholder="Unlock exclusive student deals & discounts"
            />
          </div>
          <div>
            <BilingualField
              label="Button Text"
              value={form.student_button}
              valueAr={form.student_button_ar ?? ""}
              onChange={(v) => handleField("student_button", v)}
              onChangeAr={(v) => handleField("student_button_ar", v)}
              placeholder="Verify Student"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
