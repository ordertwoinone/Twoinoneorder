"use client";
import { useEffect, useState } from "react";
import { Save, Globe, Phone, MapPin, Share2, RefreshCw, BarChart3, Smartphone, ToggleRight } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import BilingualField from "@/components/admin/BilingualField";

interface Settings {
  id: string;
  site_name: string;
  site_name_ar: string;
  tagline: string;
  tagline_ar: string;
  logo_url: string;
  favicon_url: string;
  og_image_url: string;
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  tiktok_url: string;
  whatsapp_number: string;
  address: string;
  address_ar: string;
  city: string;
  city_ar: string;
  country: string;
  country_ar: string;
  email: string;
  phone: string;
  meta_pixel_id: string;
  ga_measurement_id: string;
  gtm_id: string;
  head_scripts: string;
  /* Added by supabase/splash_and_feature_toggles.sql. */
  splash_image_url: string;
  splash_enabled: boolean;
  student_card_enabled: boolean;
}

const EMPTY: Omit<Settings, "id"> = {
  site_name: "",
  site_name_ar: "", tagline: "", tagline_ar: "", logo_url: "", favicon_url: "", og_image_url: "",
  facebook_url: "", instagram_url: "", twitter_url: "", tiktok_url: "",
  whatsapp_number: "", address: "", address_ar: "", city: "", city_ar: "",
  country: "UAE", country_ar: "", email: "", phone: "",
  meta_pixel_id: "", ga_measurement_id: "", gtm_id: "", head_scripts: "",
  splash_image_url: "", splash_enabled: true, student_card_enabled: true,
};

/** What the splash falls back to with nothing uploaded — mirrors lib/site-flags. */
const FALLBACK_SPLASH = "/splash/we-bring-it-fast.png";

export default function SettingsAdmin() {
  const [form, setForm] = useState<Omit<Settings, "id"> & { id?: string }>({ ...EMPTY });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
  /* The splash and feature switches need columns that a hand-run migration
     adds. Without them the controls would appear to do nothing, so say so. */
  const [togglesReady, setTogglesReady] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          ...data,
          // Missing columns (migration not run) read as "on", matching the site.
          splash_enabled: data.splash_enabled !== false,
          student_card_enabled: data.student_card_enabled !== false,
        });
        setTogglesReady("splash_enabled" in data);
        setLoading(false);
      });
  }, []);

  function handleField(key: string, value: string | boolean) {
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
    /* Sending a column the database hasn't got fails the whole save, taking the
       rest of the settings down with it. Leave the new ones out until then. */
    const payload = { ...form };
    if (!togglesReady) {
      delete (payload as Partial<Settings>).splash_image_url;
      delete (payload as Partial<Settings>).splash_enabled;
      delete (payload as Partial<Settings>).student_card_enabled;
    }
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

  const Toggle = ({ label, hint, field }: { label: string; hint: string; field: "splash_enabled" | "student_card_enabled" }) => (
    <div className="flex items-start justify-between gap-6">
      <div>
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={form[field]}
        aria-label={label}
        disabled={!togglesReady}
        onClick={() => handleField(field, !form[field])}
        className={`relative w-12 h-7 rounded-full shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          form[field] ? "bg-orange-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
            form[field] ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );

  const MigrationNotice = () =>
    togglesReady ? null : (
      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2">
        Run <code className="font-mono">supabase/splash_and_feature_toggles.sql</code> in the
        Supabase SQL editor to switch these on — there is nowhere to save them until then.
      </p>
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
          <BilingualField
            label="Site Name"
            value={form.site_name}
            valueAr={form.site_name_ar ?? ""}
            onChange={(v) => handleField("site_name", v)}
            onChangeAr={(v) => handleField("site_name_ar", v)}
            placeholder="Two In One UAE"
          />
          <BilingualField
            label="Tagline"
            value={form.tagline}
            valueAr={form.tagline_ar ?? ""}
            onChange={(v) => handleField("tagline", v)}
            onChangeAr={(v) => handleField("tagline_ar", v)}
            placeholder="4 Restaurants. One Destination."
          />
        </div>
        <ImageUploadField label="Logo" value={form.logo_url} onChange={(v) => handleField("logo_url", v)} folder="brand" />
        <ImageUploadField label="Favicon (.ico or .png)" value={form.favicon_url} onChange={(v) => handleField("favicon_url", v)} folder="brand" />
        <ImageUploadField label="OG Image (social share preview, 1200×630)" value={form.og_image_url} onChange={(v) => handleField("og_image_url", v)} folder="brand" />
      </Section>

      {/* Splash screen */}
      <Section icon={Smartphone} title="Splash Screen">
        <p className="text-xs text-gray-400 -mt-1">
          The opening screen on phones — shown once per visit while the site loads. Desktop never
          sees it. A tall image on a plain background works best; leave the picture blank to use the
          one shipped with the site.
        </p>
        <MigrationNotice />
        <Toggle
          label="Show the splash screen"
          hint="Off means the site opens straight onto the homepage."
          field="splash_enabled"
        />
        <ImageUploadField
          label="Splash Image"
          value={form.splash_image_url}
          onChange={(v) => handleField("splash_image_url", v)}
          folder="brand"
          hint="1000×1000 px, PNG with a transparent or white background"
        />
        {/* What a phone actually shows, at roughly the real proportions. */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-1.5">Preview</p>
          <div className="w-[150px] h-[280px] rounded-2xl border border-gray-200 bg-white flex items-center justify-center px-5 overflow-hidden">
            {form.splash_enabled ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.splash_image_url || FALLBACK_SPLASH}
                alt="Splash preview"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <span className="text-[11px] text-gray-400 text-center">No splash screen</span>
            )}
          </div>
        </div>
      </Section>

      {/* Feature switches */}
      <Section icon={ToggleRight} title="Features">
        <MigrationNotice />
        <Toggle
          label="Student Privilege Card"
          hint="Off hides the “Are you a student?” invitation and closes the registration form. Cards already issued keep working and keep their discount."
          field="student_card_enabled"
        />
        <div className="flex items-start justify-between gap-6 pt-1 border-t border-gray-100">
          <div className="pt-4">
            <p className="text-xs font-semibold text-gray-700">Spin &amp; Win offer wheel</p>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              Switched on and off from its own screen, along with the prizes.
            </p>
          </div>
          <a
            href="/admin/spin-wheel"
            className="mt-4 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-colors shrink-0"
          >
            Open Spin Wheel
          </a>
        </div>
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
        <BilingualField
          label="Street Address"
          value={form.address}
          valueAr={form.address_ar ?? ""}
          onChange={(v) => handleField("address", v)}
          onChangeAr={(v) => handleField("address_ar", v)}
          placeholder="Al Nahda, Dubai"
        />
        <div className="grid grid-cols-2 gap-4">
          <BilingualField
            label="City"
            value={form.city}
            valueAr={form.city_ar ?? ""}
            onChange={(v) => handleField("city", v)}
            onChangeAr={(v) => handleField("city_ar", v)}
            placeholder="Dubai"
          />
          <BilingualField
            label="Country"
            value={form.country}
            valueAr={form.country_ar ?? ""}
            onChange={(v) => handleField("country", v)}
            onChangeAr={(v) => handleField("country_ar", v)}
            placeholder="UAE"
          />
        </div>
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
