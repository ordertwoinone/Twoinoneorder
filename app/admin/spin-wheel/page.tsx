"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Save, Disc3, GripVertical, Mail, Download, Settings2, RefreshCw } from "lucide-react";

interface Settings {
  id: string;
  is_enabled: boolean;
  title: string;
  subtitle: string;
  button_label: string;
  spin_label: string;
  win_message: string;
  lose_message: string;
  cooldown_hours: number;
  require_email: boolean;
}

interface Segment {
  id: string;
  label: string;
  code: string;
  color: string;
  weight: number;
  is_winning: boolean;
  is_active: boolean;
  usage_limit: number;
  times_won: number;
  sort_order: number;
}

interface Entry {
  id: string;
  email: string;
  prize_label: string;
  prize_code: string;
  is_winning: boolean;
  created_at: string;
}

const BLANK_SEGMENT: Omit<Segment, "id"> = {
  label: "",
  code: "",
  color: "#ea580c",
  weight: 1,
  is_winning: true,
  is_active: true,
  usage_limit: 0,
  times_won: 0,
  sort_order: 0,
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

const PRESET_COLORS = ["#ea580c", "#16a34a", "#2563eb", "#db2777", "#9333ea", "#ca8a04", "#64748b", "#0d9488"];

export default function SpinWheelAdmin() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Segment, "id">>(BLANK_SEGMENT);
  const [savingSegment, setSavingSegment] = useState(false);
  const [tab, setTab] = useState<"setup" | "entries">("setup");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/spin-wheel/settings", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/spin-wheel/segments", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([settingsData, segmentsData]) => {
        setSettings(settingsData);
        setSegments(Array.isArray(segmentsData) ? segmentsData : []);
      })
      .finally(() => setLoading(false));
  }, []);

  function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  function segField(key: keyof typeof form, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveSettings(override?: Partial<Settings>) {
    if (!settings) return;
    const payload = { ...settings, ...override };
    setSavingSettings(true);
    await fetch("/api/admin/spin-wheel/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingSettings(false);
    setSavedSettings(true);
    setTimeout(() => setSavedSettings(false), 3000);
  }

  // Toggle the master on/off switch and persist it right away.
  async function toggleLive() {
    if (!settings) return;
    const next = !settings.is_enabled;
    setSetting("is_enabled", next);
    await saveSettings({ is_enabled: next });
  }

  async function createSegment() {
    if (!form.label.trim()) return;
    setSavingSegment(true);
    const res = await fetch("/api/admin/spin-wheel/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sort_order: segments.length + 1 }),
    });
    const data = await res.json();
    if (!data.error) {
      setSegments((prev) => [...prev, data]);
      setForm(BLANK_SEGMENT);
      setShowForm(false);
    }
    setSavingSegment(false);
  }

  async function patchSegment(id: string, changes: Partial<Segment>) {
    const res = await fetch(`/api/admin/spin-wheel/segments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    const data = await res.json();
    if (!data.error) {
      setSegments((prev) => prev.map((x) => (x.id === id ? { ...x, ...changes } : x)));
    }
  }

  // Update a slice locally only (no save) — used while typing in the limit field.
  function setSegmentLocal(id: string, changes: Partial<Segment>) {
    setSegments((prev) => prev.map((x) => (x.id === id ? { ...x, ...changes } : x)));
  }

  async function deleteSegment(id: string) {
    if (!confirm("Delete this slice?")) return;
    await fetch(`/api/admin/spin-wheel/segments/${id}`, { method: "DELETE" });
    setSegments((prev) => prev.filter((s) => s.id !== id));
  }

  async function loadEntries() {
    setLoadingEntries(true);
    const data = await fetch("/api/admin/spin-wheel/entries", { cache: "no-store" }).then((r) => r.json());
    setEntries(Array.isArray(data) ? data : []);
    setLoadingEntries(false);
  }

  function openEntries() {
    setTab("entries");
    loadEntries();
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this entry?")) return;
    await fetch(`/api/admin/spin-wheel/entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function exportCsv() {
    const header = ["Email", "Prize", "Code", "Won", "Date"];
    const rows = entries.map((e) => [
      e.email,
      e.prize_label,
      e.prize_code,
      e.is_winning ? "Yes" : "No",
      new Date(e.created_at).toLocaleString(),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `spin-wheel-entries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !settings) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  const activeWinning = segments.filter((s) => s.is_active && s.weight > 0);
  const totalWeight = activeWinning.reduce((sum, s) => sum + s.weight, 0);

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Disc3 size={13} /> Offer Wheel
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">Spin &amp; Win</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Control the floating spin-wheel widget and the prizes it gives out
          </p>
        </div>
        <button
          onClick={toggleLive}
          disabled={savingSettings}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors shrink-0 disabled:opacity-60 ${
            settings.is_enabled
              ? "border-green-400 bg-green-50 text-green-600"
              : "border-gray-200 text-gray-400 hover:border-gray-300"
          }`}
        >
          {settings.is_enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {settings.is_enabled ? "Live" : "Hidden"}
        </button>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("setup")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "setup" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Settings2 size={15} /> Setup
        </button>
        <button
          onClick={openEntries}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "entries" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Mail size={15} /> Entries
        </button>
      </div>

      {tab === "setup" && (
      <>
      {/* ── Conditions / settings ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Wheel Settings</h2>
          <button
            onClick={() => saveSettings()}
            disabled={savingSettings}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-70"
            style={{ background: savedSettings ? "#16a34a" : "#ea580c" }}
          >
            <Save size={14} />
            {savingSettings ? "Saving..." : savedSettings ? "Saved!" : "Save"}
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Popup Title</label>
              <input value={settings.title} onChange={(e) => setSetting("title", e.target.value)} className={inputCls} placeholder="Spin & Win!" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Floating Button Text</label>
              <input value={settings.button_label} onChange={(e) => setSetting("button_label", e.target.value)} className={inputCls} placeholder="Spin & Win" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subtitle</label>
            <input value={settings.subtitle} onChange={(e) => setSetting("subtitle", e.target.value)} className={inputCls} placeholder="Try your luck and grab an exclusive offer" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Win Message</label>
              <input value={settings.win_message} onChange={(e) => setSetting("win_message", e.target.value)} className={inputCls} placeholder="Congratulations! You won" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">No-Win Message</label>
              <input value={settings.lose_message} onChange={(e) => setSetting("lose_message", e.target.value)} className={inputCls} placeholder="Better luck next time" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Centre Button Text</label>
              <input value={settings.spin_label} onChange={(e) => setSetting("spin_label", e.target.value)} className={inputCls} placeholder="SPIN" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Spin Cooldown (hours)
                <span className="ml-1 text-gray-400 font-normal">0 = unlimited</span>
              </label>
              <input
                type="number"
                min="0"
                value={settings.cooldown_hours}
                onChange={(e) => setSetting("cooldown_hours", parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={settings.require_email}
              onChange={(e) => setSetting("require_email", e.target.checked)}
              className="w-4 h-4 rounded accent-orange-500"
            />
            <span className="text-sm text-gray-700">Ask visitors for their email before they can spin</span>
          </label>
        </div>
      </div>

      {/* ── Slices / contents ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Wheel Slices</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {activeWinning.length} active · win odds based on weight
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#ea580c" }}
        >
          <Plus size={15} />
          Add Slice
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 mb-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Label *</label>
              <input value={form.label} onChange={(e) => segField("label", e.target.value)} className={inputCls} placeholder="e.g. 10% OFF" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Prize Code</label>
              <input value={form.code} onChange={(e) => segField("code", e.target.value.toUpperCase())} className={inputCls} placeholder="e.g. SPIN10" disabled={!form.is_winning} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Win Weight</label>
              <input type="number" min="0" value={form.weight} onChange={(e) => segField("weight", parseInt(e.target.value) || 0)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Type</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => segField("is_winning", true)} className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-colors ${form.is_winning ? "border-orange-400 bg-orange-50 text-orange-600" : "border-gray-200 text-gray-400"}`}>Prize</button>
                <button type="button" onClick={() => { segField("is_winning", false); segField("code", ""); }} className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-colors ${!form.is_winning ? "border-orange-400 bg-orange-50 text-orange-600" : "border-gray-200 text-gray-400"}`}>No Win</button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Win Limit
              <span className="ml-1 text-gray-400 font-normal">0 = unlimited</span>
            </label>
            <input
              type="number"
              min="0"
              value={form.usage_limit}
              onChange={(e) => segField("usage_limit", Math.max(0, parseInt(e.target.value) || 0))}
              className={inputCls}
              placeholder="e.g. 50"
              disabled={!form.is_winning}
            />
            <p className="text-[11px] text-gray-400 mt-1">Once this prize has been won this many times, the wheel stops awarding it.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Slice Colour</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => segField("color", c)}
                  className={`w-7 h-7 rounded-full border-2 transition ${form.color === c ? "border-gray-800 scale-110" : "border-white"}`}
                  style={{ background: c }} />
              ))}
              <input type="color" value={form.color} onChange={(e) => segField("color", e.target.value)} className="w-7 h-7 rounded cursor-pointer border border-gray-200" />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={() => { setShowForm(false); setForm(BLANK_SEGMENT); }} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
            <button onClick={createSegment} disabled={savingSegment || !form.label.trim()} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
              {savingSegment ? "Adding..." : "Add Slice"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {segments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-400">No slices yet. Add at least 2 to show the wheel.</p>
          </div>
        ) : (
          segments.map((s) => {
            const odds = s.is_active && s.weight > 0 && totalWeight > 0 ? Math.round((s.weight / totalWeight) * 100) : 0;
            const depleted = s.is_winning && s.usage_limit > 0 && s.times_won >= s.usage_limit;
            return (
              <div key={s.id} className={`bg-white rounded-xl border flex items-center gap-3 px-4 py-3 transition-all ${s.is_active ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
                <GripVertical size={15} className="text-gray-300 shrink-0" />
                <span className="w-5 h-5 rounded-full shrink-0 border border-black/5" style={{ background: s.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{s.label}</span>
                    {s.is_winning && s.code && (
                      <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100">{s.code}</span>
                    )}
                    {!s.is_winning && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">NO WIN</span>
                    )}
                    {depleted && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100">LIMIT REACHED</span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-gray-400 mt-0.5">
                    ~{odds}% chance to land here
                    {s.is_winning && (
                      <> · won {s.times_won}{s.usage_limit > 0 ? `/${s.usage_limit}` : ""}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Win chance (relative weight) — applies to every slice */}
                  <label className="flex flex-col items-center" title="Win chance — a higher weight lands more often. Set 0 so it never lands here.">
                    <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide leading-none mb-1">Chance</span>
                    <input
                      type="number"
                      min="0"
                      value={s.weight}
                      onChange={(e) => setSegmentLocal(s.id, { weight: Math.max(0, parseInt(e.target.value) || 0) })}
                      onBlur={(e) => patchSegment(s.id, { weight: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-14 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </label>

                  {/* Per-slice win limit (winning slices only) */}
                  {s.is_winning && (
                    <div className="flex items-end gap-1.5">
                      <label className="flex flex-col items-center" title="Win limit (0 = unlimited)">
                        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide leading-none mb-1">Limit</span>
                        <input
                          type="number"
                          min="0"
                          value={s.usage_limit}
                          onChange={(e) => setSegmentLocal(s.id, { usage_limit: Math.max(0, parseInt(e.target.value) || 0) })}
                          onBlur={(e) => patchSegment(s.id, { usage_limit: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-14 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                      </label>
                      {s.times_won > 0 && (
                        <button onClick={() => { if (confirm("Reset the won count for this slice?")) patchSegment(s.id, { times_won: 0 }); }} className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center" title="Reset won count">
                          <RefreshCw size={13} className="text-gray-400" />
                        </button>
                      )}
                    </div>
                  )}
                  <button onClick={() => patchSegment(s.id, { is_active: !s.is_active })} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center" title={s.is_active ? "Hide" : "Show"}>
                    {s.is_active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-gray-400" />}
                  </button>
                  <button onClick={() => deleteSegment(s.id)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center" title="Delete">
                    <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      </>
      )}

      {/* ── Entries: captured emails + prizes ─────────────────── */}
      {tab === "entries" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Captured Entries</h2>
              <p className="text-xs text-gray-400 mt-0.5">{entries.length} email{entries.length === 1 ? "" : "s"} collected</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadEntries} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50">
                <RefreshCw size={14} className={loadingEntries ? "animate-spin" : ""} /> Refresh
              </button>
              <button onClick={exportCsv} disabled={entries.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>

          {loadingEntries ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-400">Loading entries...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Mail size={26} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No entries yet. They appear here once visitors enter their email and spin.</p>
              <p className="text-xs text-gray-300 mt-1">Tip: turn on &ldquo;Ask visitors for their email&rdquo; in Setup to collect emails.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Prize</th>
                    <th className="px-4 py-2.5">Code</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{e.email}</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {e.is_winning ? (
                          <span className="text-gray-700">{e.prize_label}</span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">NO WIN</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {e.prize_code ? (
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100">{e.prize_code}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-gray-400 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => deleteEntry(e.id)} className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 inline-flex items-center justify-center" title="Delete">
                          <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
