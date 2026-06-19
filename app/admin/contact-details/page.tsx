"use client";
import { useEffect, useState } from "react";
import { Save, MessageSquare, Image as ImageIcon, MapPin } from "lucide-react";
import Link from "next/link";
import ImageUploadField from "@/components/admin/ImageUploadField";

const CONTACT_FIELDS = [
  "contact_restaurant_name",
  "contact_location_label",
  "contact_rating",
  "contact_reviews",
  "contact_hero_image_url",
  "contact_heading",
  "contact_heading_highlight",
  "contact_subheading",
  "contact_hours",
] as const;

type ContactForm = Record<(typeof CONTACT_FIELDS)[number], string> & { id?: string };

const EMPTY: ContactForm = {
  contact_restaurant_name: "", contact_location_label: "", contact_rating: "",
  contact_reviews: "", contact_hero_image_url: "", contact_heading: "",
  contact_heading_highlight: "", contact_subheading: "", contact_hours: "",
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 transition";

export default function ContactDetailsAdmin() {
  const [form, setForm] = useState<ContactForm>({ ...EMPTY });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const next: ContactForm = { ...EMPTY, id: data.id };
        CONTACT_FIELDS.forEach((k) => { next[k] = data[k] ?? ""; });
        setForm(next);
        setLoading(false);
      });
  }, []);

  function handleField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    // Only the contact fields (+ id) are sent — other settings are untouched.
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>;
  }

  const Field = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Contact Page</p>
          <h1 className="text-2xl font-semibold text-gray-900">Banner &amp; Details</h1>
          <p className="text-sm text-gray-500 mt-0.5">The hero, headline and opening hours on the public contact page</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-70" style={{ background: saved ? "#16a34a" : "#ea580c" }}>
          <Save size={15} />
          {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
        </button>
      </div>

      {/* Hero card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <ImageIcon size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Hero / Restaurant Card</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Restaurant Name" value={form.contact_restaurant_name} onChange={(v) => handleField("contact_restaurant_name", v)} placeholder="Two in One Restaurant" />
            <Field label="Location Label" value={form.contact_location_label} onChange={(v) => handleField("contact_location_label", v)} placeholder="Al Nahda, Fujairah, Dubai" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rating" value={form.contact_rating} onChange={(v) => handleField("contact_rating", v)} placeholder="4.8" />
            <Field label="Reviews Label" value={form.contact_reviews} onChange={(v) => handleField("contact_reviews", v)} placeholder="2.3K+ Reviews" />
          </div>
          <ImageUploadField label="Hero Food Image" value={form.contact_hero_image_url} onChange={(v) => handleField("contact_hero_image_url", v)} folder="contact" />
        </div>
      </div>

      {/* Headline */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <MessageSquare size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Headline &amp; Hours</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Heading" value={form.contact_heading} onChange={(v) => handleField("contact_heading", v)} placeholder="Get in" />
            <Field label="Heading Highlight (orange)" value={form.contact_heading_highlight} onChange={(v) => handleField("contact_heading_highlight", v)} placeholder="Touch" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subheading</label>
            <textarea value={form.contact_subheading || ""} onChange={(e) => handleField("contact_subheading", e.target.value)} rows={3} placeholder="We're here to help with orders, catering…" className={`${inputCls} resize-y`} />
          </div>
          <Field label="Opening Hours" value={form.contact_hours} onChange={(v) => handleField("contact_hours", v)} placeholder="Every day · 9:00 AM – 11:00 PM" />
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Phone, WhatsApp and email come from <Link href="/admin/settings" className="text-orange-600 font-medium">Settings</Link>.
        Map pins are managed under <Link href="/admin/contact-locations" className="text-orange-600 font-medium inline-flex items-center gap-0.5"><MapPin size={11} /> Map Locations</Link>.
      </p>
    </div>
  );
}
