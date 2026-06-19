"use client";
import { useEffect, useState } from "react";
import { Save, Globe, Phone, MapPin, Share2, RefreshCw, BarChart3, MessageSquare } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

interface Settings {
  id: string;
  site_name: string;
  tagline: string;
  logo_url: string;
  favicon_url: string;
  og_image_url: string;
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  tiktok_url: string;
  whatsapp_number: string;
  address: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  meta_pixel_id: string;
  ga_measurement_id: string;
  gtm_id: string;
  head_scripts: string;
  contact_heading: string;
  contact_heading_highlight: string;
  contact_subheading: string;
  contact_hours: string;
}

const EMPTY: Omit<Settings, "id"> = {
  site_name: "", tagline: "", logo_url: "", favicon_url: "", og_image_url: "",
  facebook_url: "", instagram_url: "", twitter_url: "", tiktok_url: "",
  whatsapp_number: "", address: "", city: "", country: "UAE", email: "", phone: "",
  meta_pixel_id: "", ga_measurement_id: "", gtm_id: "", head_scripts: "",
  contact_heading: "", contact_heading_highlight: "", contact_subheading: "", contact_hours: "",
};

export default function SettingsAdmin() {
  const [form, setForm] = useState<Omit<Settings, "id"> & { id?: string }>({ ...EMPTY });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setForm(data);
        setLoading(false);
      });
  }, []);

  function handleField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleClearCache() {
    setClearing(true);
    await fetch("/api/admin/revalidate", { method: "POST" });
    setClearing(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  }

  async function handleSave() {
    setSaving(true);
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
    return (
      <div className="p-8 flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading settings...
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50">
        <Icon size={16} className="text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );

  const Field = ({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
      />
    </div>
  );

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your site information</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearCache}
            disabled={clearing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-70 border"
            style={{
              color: cleared ? "#16a34a" : "#6b7280",
              borderColor: cleared ? "#16a34a" : "#e5e7eb",
              background: cleared ? "#f0fdf4" : "#fff",
            }}
          >
            <RefreshCw size={14} className={clearing ? "animate-spin" : ""} />
            {clearing ? "Clearing..." : cleared ? "Cache Cleared!" : "Clear Cache"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-70"
            style={{ background: saved ? "#16a34a" : "#ea580c" }}
          >
            <Save size={15} />
            {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Brand */}
      <Section icon={Globe} title="Brand">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Site Name" value={form.site_name} onChange={(v) => handleField("site_name", v)} placeholder="Two In One UAE" />
          <Field label="Tagline" value={form.tagline} onChange={(v) => handleField("tagline", v)} placeholder="4 Restaurants. One Destination." />
        </div>
        <ImageUploadField label="Logo" value={form.logo_url} onChange={(v) => handleField("logo_url", v)} folder="brand" />
        <ImageUploadField label="Favicon (.ico or .png)" value={form.favicon_url} onChange={(v) => handleField("favicon_url", v)} folder="brand" />
        <ImageUploadField label="OG Image (social share preview, 1200×630)" value={form.og_image_url} onChange={(v) => handleField("og_image_url", v)} folder="brand" />
      </Section>

      {/* Social */}
      <Section icon={Share2} title="Social Media">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Facebook URL" value={form.facebook_url} onChange={(v) => handleField("facebook_url", v)} placeholder="https://facebook.com/..." />
          <Field label="Instagram URL" value={form.instagram_url} onChange={(v) => handleField("instagram_url", v)} placeholder="https://instagram.com/..." />
          <Field label="Twitter / X URL" value={form.twitter_url} onChange={(v) => handleField("twitter_url", v)} placeholder="https://twitter.com/..." />
          <Field label="TikTok URL" value={form.tiktok_url} onChange={(v) => handleField("tiktok_url", v)} placeholder="https://tiktok.com/..." />
          <Field label="WhatsApp Number" value={form.whatsapp_number} onChange={(v) => handleField("whatsapp_number", v)} placeholder="971501234567" />
        </div>
      </Section>

      {/* Contact */}
      <Section icon={Phone} title="Contact Details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" value={form.email} onChange={(v) => handleField("email", v)} placeholder="info@twoinoneae.com" type="email" />
          <Field label="Phone" value={form.phone} onChange={(v) => handleField("phone", v)} placeholder="+971 50 123 4567" />
        </div>
      </Section>

      {/* Address */}
      <Section icon={MapPin} title="Address">
        <Field label="Street Address" value={form.address} onChange={(v) => handleField("address", v)} placeholder="Al Nahda, Dubai" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="City" value={form.city} onChange={(v) => handleField("city", v)} placeholder="Dubai" />
          <Field label="Country" value={form.country} onChange={(v) => handleField("country", v)} placeholder="UAE" />
        </div>
      </Section>

      {/* Contact Page */}
      <Section icon={MessageSquare} title="Contact Page">
        <p className="text-xs text-gray-400 -mt-1">
          Controls the headline and opening hours shown on the public Contact page. The call, WhatsApp,
          email and location cards use the details from the sections above.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Heading" value={form.contact_heading} onChange={(v) => handleField("contact_heading", v)} placeholder="We'd Love to" />
          <Field label="Heading Highlight (orange)" value={form.contact_heading_highlight} onChange={(v) => handleField("contact_heading_highlight", v)} placeholder="Hear From You" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subheading</label>
          <textarea
            value={form.contact_subheading || ""}
            onChange={(e) => handleField("contact_subheading", e.target.value)}
            rows={3}
            placeholder="Questions about an order, catering, or a table booking?..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 transition resize-y"
          />
        </div>
        <Field label="Opening Hours" value={form.contact_hours} onChange={(v) => handleField("contact_hours", v)} placeholder="Every day · 9:00 AM – 11:00 PM" />
      </Section>

      {/* Tracking & Analytics */}
      <Section icon={BarChart3} title="Tracking & Analytics">
        <p className="text-xs text-gray-400 -mt-1">
          Paste the IDs from each platform. Tracking activates automatically once an ID is saved — leave blank to disable.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Meta (Facebook) Pixel ID" value={form.meta_pixel_id} onChange={(v) => handleField("meta_pixel_id", v)} placeholder="e.g. 123456789012345" />
          <Field label="Google Analytics ID (GA4)" value={form.ga_measurement_id} onChange={(v) => handleField("ga_measurement_id", v)} placeholder="e.g. G-XXXXXXXXXX" />
        </div>
        <Field label="Google Tag Manager ID" value={form.gtm_id} onChange={(v) => handleField("gtm_id", v)} placeholder="e.g. GTM-XXXXXXX" />
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Other Tags / Custom Head Code</label>
          <textarea
            value={form.head_scripts || ""}
            onChange={(e) => handleField("head_scripts", e.target.value)}
            rows={5}
            placeholder={"Paste any extra <script> or <meta> tags here (TikTok Pixel, Snap Pixel, site verification, etc.)"}
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 transition resize-y"
          />
          <p className="text-[11px] text-gray-400 mt-1.5">
            Added to every page&apos;s &lt;head&gt;. Scripts run on load. Only paste code from sources you trust.
          </p>
        </div>
      </Section>
    </div>
  );
}
