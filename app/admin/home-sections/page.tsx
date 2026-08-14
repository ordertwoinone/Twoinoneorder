"use client";
import { useEffect, useState } from "react";
import { Save, Sparkles, Tag } from "lucide-react";
import BilingualField from "@/components/admin/BilingualField";

/**
 * admin → Homepage → Home Sections.
 *
 * The headings above the two item strips. Items themselves are published to a
 * strip from wherever they live — the toggle in each area's own table — so this
 * screen is only the wording.
 */

const FIELDS = [
  "top_picks_title",
  "top_picks_title_ar",
  "top_picks_subtitle",
  "top_picks_subtitle_ar",
  "deals_title",
  "deals_title_ar",
  "deals_subtitle",
  "deals_subtitle_ar",
] as const;

type Form = Record<(typeof FIELDS)[number], string> & { id?: string };

const EMPTY = Object.fromEntries(FIELDS.map((f) => [f, ""])) as Form;

/** What blank prints — shown as the placeholder so it never looks missing. */
const DEFAULTS: Record<string, string> = {
  top_picks_title: "Top Picks For You",
  top_picks_subtitle: "Handpicked dishes from our kitchens",
  deals_title: "Deals You'll Love",
  deals_subtitle: "Hand-picked offers worth ordering today",
};

export default function HomeSectionsAdmin() {
  const [form, setForm] = useState<Form>({ ...EMPTY });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  /* The columns arrive with a hand-run migration. Without them the form would
     look like it works and save nowhere, so say so instead. */
  const [ready, setReady] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const next: Form = { ...EMPTY, id: data.id };
        FIELDS.forEach((f) => { next[f] = data[f] ?? ""; });
        setReady("top_picks_title" in data);
        setForm(next);
        setLoading(false);
      });
  }, []);

  function set(key: (typeof FIELDS)[number], value: string) {
    setForm((f) => ({ ...f, [key]: value }));
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
        Loading sections...
      </div>
    );
  }

  const Section = ({
    icon: Icon,
    title,
    hint,
    children,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    title: string;
    hint: string;
    children: React.ReactNode;
  }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50">
        <Icon size={16} className="text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">
        <p className="text-xs text-gray-400 -mt-1">{hint}</p>
        {children}
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Homepage</p>
          <h1 className="text-2xl font-semibold text-gray-900">Home Sections</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            The headings above the two item strips
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-70 shrink-0"
          style={{ background: saved ? "#16a34a" : "#ea580c" }}
        >
          <Save size={15} />
          {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
        </button>
      </div>

      {!ready && (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-5">
          Run <code className="font-mono">supabase/home_deals.sql</code> in the Supabase SQL editor
          before saving — there is nowhere to store these headings until then.
        </p>
      )}

      <Section
        icon={Sparkles}
        title="Top Picks For You"
        hint="Leave a field blank to print the wording that ships with the site. Add items to this strip with the Top Picks switch on any item screen."
      >
        <BilingualField
          label="Heading"
          value={form.top_picks_title}
          valueAr={form.top_picks_title_ar}
          onChange={(v) => set("top_picks_title", v)}
          onChangeAr={(v) => set("top_picks_title_ar", v)}
          placeholder={DEFAULTS.top_picks_title}
        />
        <BilingualField
          label="Small line underneath"
          value={form.top_picks_subtitle}
          valueAr={form.top_picks_subtitle_ar}
          onChange={(v) => set("top_picks_subtitle", v)}
          onChangeAr={(v) => set("top_picks_subtitle_ar", v)}
          placeholder={DEFAULTS.top_picks_subtitle}
        />
      </Section>

      <Section
        icon={Tag}
        title="Deals You'll Love"
        hint="The second strip. Add items to it with the Deals switch on any item screen — an item can be in both."
      >
        <BilingualField
          label="Heading"
          value={form.deals_title}
          valueAr={form.deals_title_ar}
          onChange={(v) => set("deals_title", v)}
          onChangeAr={(v) => set("deals_title_ar", v)}
          placeholder={DEFAULTS.deals_title}
        />
        <BilingualField
          label="Small line underneath"
          value={form.deals_subtitle}
          valueAr={form.deals_subtitle_ar}
          onChange={(v) => set("deals_subtitle", v)}
          onChangeAr={(v) => set("deals_subtitle_ar", v)}
          placeholder={DEFAULTS.deals_subtitle}
        />
      </Section>

      <p className="text-[11px] text-gray-400">
        A strip with no items switched on is hidden entirely, heading and all.
      </p>
    </div>
  );
}
