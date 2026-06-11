"use client";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

interface BuffetHero {
  id?: string;
  restaurant_name: string;
  cuisine: string;
  rating: string;
  rating_count: string;
  delivery_time: string;
  delivery_fee: string;
  is_open: boolean;
  closes_at: string;
  cover_image_url: string;
}

const DEFAULTS: BuffetHero = {
  restaurant_name: "Buffet By Two In One",
  cuisine: "Buffet · International",
  rating: "4.6",
  rating_count: "2.1K+",
  delivery_time: "20–30 min",
  delivery_fee: "KD 0.600 delivery",
  is_open: true,
  closes_at: "11:30 PM",
  cover_image_url: "",
};

export default function BuffetHeroAdmin() {
  const [form, setForm] = useState<BuffetHero>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/buffet/hero")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setForm(data);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleField(key: keyof BuffetHero, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/buffet/hero", {
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
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Buffet Page</p>
          <h1 className="text-2xl font-semibold text-gray-900">Buffet Hero</h1>
          <p className="text-sm text-gray-500 mt-0.5">Restaurant info shown at the top of the buffet page</p>
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
        {/* Restaurant Name */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Restaurant Info</h2>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Restaurant Name</label>
            <input
              type="text"
              value={form.restaurant_name}
              onChange={(e) => handleField("restaurant_name", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Buffet By Two In One"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Cuisine / Type</label>
            <input
              type="text"
              value={form.cuisine}
              onChange={(e) => handleField("cuisine", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Buffet · International"
            />
          </div>
        </div>

        {/* Ratings & Delivery */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Ratings & Delivery</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rating</label>
              <input
                type="text"
                value={form.rating}
                onChange={(e) => handleField("rating", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="4.6"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rating Count</label>
              <input
                type="text"
                value={form.rating_count}
                onChange={(e) => handleField("rating_count", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="2.1K+"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Delivery Time</label>
              <input
                type="text"
                value={form.delivery_time}
                onChange={(e) => handleField("delivery_time", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="20–30 min"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Delivery Fee</label>
              <input
                type="text"
                value={form.delivery_fee}
                onChange={(e) => handleField("delivery_fee", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="KD 0.600 delivery"
              />
            </div>
          </div>
        </div>

        {/* Open Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Open Status</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleField("is_open", true)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${form.is_open ? "border-green-400 bg-green-50 text-green-700" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => handleField("is_open", false)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${!form.is_open ? "border-red-400 bg-red-50 text-red-600" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
                >
                  Closed
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Closes At</label>
              <input
                type="text"
                value={form.closes_at}
                onChange={(e) => handleField("closes_at", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="11:30 PM"
              />
            </div>
          </div>
        </div>

        {/* Cover Image */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Cover Image</h2>
          <ImageUploadField
            label="Cover Photo (shown top-right of the hero section)"
            value={form.cover_image_url}
            onChange={(url) => handleField("cover_image_url", url)}
            folder="general"
          />
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Preview</h2>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-14 h-14 rounded-full bg-gray-900 flex flex-col items-center justify-center shrink-0 border-2 border-yellow-400">
              <p className="text-white font-bold text-center leading-none" style={{ fontSize: "4px" }}>BUFFET BY</p>
              <p className="text-yellow-400 font-bold text-center leading-none" style={{ fontSize: "4px" }}>TWO IN ONE</p>
            </div>
            <div className="flex-1">
              <p className="font-extrabold text-gray-900 text-base">{form.restaurant_name}</p>
              <p className="text-xs text-gray-500">{form.cuisine}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                <span className="text-yellow-400">★</span>
                <span className="font-semibold text-gray-800">{form.rating}</span>
                <span>({form.rating_count})</span>
                <span>·</span>
                <span>{form.delivery_time}</span>
                <span>·</span>
                <span>{form.delivery_fee}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${form.is_open ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {form.is_open ? "Open" : "Closed"}
                </span>
                <span className="text-[10px] text-gray-400">· Closes {form.closes_at}</span>
              </div>
            </div>
            {form.cover_image_url && (
              <div className="w-24 h-16 rounded-xl overflow-hidden shrink-0">
                <img src={form.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
