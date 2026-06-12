"use client";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";

interface KalbaHero {
  id?: string;
  name: string;
  location: string;
  maps_url: string;
  whatsapp: string;
  rating: string;
  rating_count: string;
  delivery_time: string;
  delivery_fee: string;
  is_open: boolean;
  closes_at: string;
  student_title: string;
  student_subtitle: string;
  student_button: string;
}

const DEFAULTS: KalbaHero = {
  name: "Two in One University Kalba",
  location: "Near University of Kalba, Kalba",
  maps_url: "https://www.google.com/maps/search/?api=1&query=University+City+Kalba+Sharjah",
  whatsapp: "971522305216",
  rating: "4.6",
  rating_count: "500+",
  delivery_time: "15–25 min",
  delivery_fee: "Free delivery",
  is_open: true,
  closes_at: "12:00 AM",
  student_title: "Are you a student?",
  student_subtitle: "Unlock exclusive student deals & discounts",
  student_button: "Verify Student",
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
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Branch Info</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Branch Name</label>
            <input type="text" value={form.name} onChange={(e) => handleField("name", e.target.value)} className={inputCls} placeholder="Two in One University Kalba" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location Label</label>
            <input type="text" value={form.location} onChange={(e) => handleField("location", e.target.value)} className={inputCls} placeholder="Near University of Kalba, Kalba" />
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
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rating Count</label>
              <input type="text" value={form.rating_count} onChange={(e) => handleField("rating_count", e.target.value)} className={inputCls} placeholder="500+" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Delivery Time</label>
              <input type="text" value={form.delivery_time} onChange={(e) => handleField("delivery_time", e.target.value)} className={inputCls} placeholder="15–25 min" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Delivery Fee</label>
              <input type="text" value={form.delivery_fee} onChange={(e) => handleField("delivery_fee", e.target.value)} className={inputCls} placeholder="Free delivery" />
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
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Closes At</label>
              <input type="text" value={form.closes_at} onChange={(e) => handleField("closes_at", e.target.value)} className={inputCls} placeholder="12:00 AM" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Student Banner (bottom of page)</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title</label>
            <input type="text" value={form.student_title} onChange={(e) => handleField("student_title", e.target.value)} className={inputCls} placeholder="Are you a student?" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subtitle</label>
            <input type="text" value={form.student_subtitle} onChange={(e) => handleField("student_subtitle", e.target.value)} className={inputCls} placeholder="Unlock exclusive student deals & discounts" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Button Text</label>
            <input type="text" value={form.student_button} onChange={(e) => handleField("student_button", e.target.value)} className={inputCls} placeholder="Verify Student" />
          </div>
        </div>
      </div>
    </div>
  );
}
