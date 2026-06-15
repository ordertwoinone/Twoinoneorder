"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

interface Card {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  emoji: string;
  image_url: string;
  badge: string;
  button_text: string;
  href: string;
  accent_color: string;
  bg_from: string;
  bg_to: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY: Omit<Card, "id"> = {
  title: "",
  subtitle: "",
  description: "",
  emoji: "🍽️",
  image_url: "",
  badge: "",
  button_text: "Learn More",
  href: "/",
  accent_color: "#ea580c",
  bg_from: "#fff8f2",
  bg_to: "#fdeedd",
  sort_order: 0,
  is_active: true,
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

const PRESETS = [
  { label: "Orange (default)", accent_color: "#ea580c", bg_from: "#fff8f2", bg_to: "#fdeedd" },
  { label: "Green",            accent_color: "#16a34a", bg_from: "#f0fdf4", bg_to: "#dcfce7" },
  { label: "Purple",           accent_color: "#7c3aed", bg_from: "#faf5ff", bg_to: "#ede9fe" },
  { label: "Blue",             accent_color: "#2563eb", bg_from: "#eff6ff", bg_to: "#dbeafe" },
  { label: "Rose",             accent_color: "#e11d48", bg_from: "#fff1f2", bg_to: "#fecdd3" },
  { label: "Amber",            accent_color: "#d97706", bg_from: "#fffbeb", bg_to: "#fef3c7" },
];

export default function HomepageCardsAdmin() {
  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    data: Omit<Card, "id"> & { id?: string };
  }>({ open: false, mode: "add", data: { ...EMPTY } });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/homepage-cards");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setModal({ open: true, mode: "add", data: { ...EMPTY, sort_order: items.length + 1 } });
  }
  function openEdit(item: Card) {
    setModal({ open: true, mode: "edit", data: { ...item } });
  }
  function closeModal() {
    setModal((m) => ({ ...m, open: false }));
  }
  function set(key: string, value: unknown) {
    setModal((m) => ({ ...m, data: { ...m.data, [key]: value } }));
  }
  function applyPreset(p: typeof PRESETS[0]) {
    setModal((m) => ({ ...m, data: { ...m.data, accent_color: p.accent_color, bg_from: p.bg_from, bg_to: p.bg_to } }));
  }

  async function handleSave() {
    setSaving(true);
    if (modal.mode === "add") {
      await fetch("/api/admin/homepage-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modal.data),
      });
    } else {
      await fetch(`/api/admin/homepage-cards/${modal.data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modal.data),
      });
    }
    setSaving(false);
    closeModal();
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await fetch(`/api/admin/homepage-cards/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  async function toggleActive(item: Card) {
    await fetch(`/api/admin/homepage-cards/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, is_active: !item.is_active }),
    });
    load();
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">
            Homepage Section
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">Now Open on Campus Cards</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.filter((i) => i.is_active).length} active · 3-card row below categories
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#ea580c" }}
        >
          <Plus size={16} /> Add card
        </button>
      </div>

      {/* Preview row */}
      {items.filter((i) => i.is_active).length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {items.filter((i) => i.is_active).map((card) => (
            <div
              key={card.id}
              className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
            >
              <div
                className="flex items-center gap-3 px-4 py-4"
                style={{ background: `linear-gradient(135deg, ${card.bg_from}, ${card.bg_to})` }}
              >
                <span className="text-3xl">{card.emoji}</span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: card.accent_color }}>
                    {card.subtitle}
                  </p>
                  <p className="text-sm font-extrabold text-gray-900 leading-tight">{card.title}</p>
                </div>
              </div>
              <div className="px-4 py-3 bg-white">
                <p className="text-[11px] text-gray-500 mb-2 line-clamp-2">{card.description}</p>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-white px-3 py-1 rounded-lg"
                  style={{ background: card.accent_color }}
                >
                  {card.button_text} →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Card</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Link</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-16 text-gray-400 text-sm">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-16 text-gray-400 text-sm">No cards yet.</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: `${item.accent_color}15` }}
                    >
                      {item.emoji}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                      <p className="text-[11px]" style={{ color: item.accent_color }}>{item.subtitle}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {item.href}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{item.sort_order}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(item)}
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors ${
                      item.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {item.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(item)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteId(item.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-base font-semibold text-gray-900">
                {modal.mode === "add" ? "Add card" : "Edit card"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Emoji + Title */}
              <div className="grid grid-cols-[64px_1fr] gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Emoji</label>
                  <input type="text" value={modal.data.emoji} onChange={(e) => set("emoji", e.target.value)}
                    className="w-full px-2 py-2.5 rounded-lg border border-gray-200 text-2xl text-center focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title</label>
                  <input type="text" value={modal.data.title} onChange={(e) => set("title", e.target.value)} className={inputCls} placeholder="Book a Table" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subtitle <span className="font-normal text-gray-400">(accent-colored label above title)</span></label>
                <input type="text" value={modal.data.subtitle} onChange={(e) => set("subtitle", e.target.value)} className={inputCls} placeholder="Reserve Your Spot" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea value={modal.data.description} onChange={(e) => set("description", e.target.value)}
                  className={`${inputCls} resize-none`} rows={2} placeholder="Short description shown on the card" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Badge <span className="font-normal text-gray-400">(top-left chip)</span></label>
                  <input type="text" value={modal.data.badge} onChange={(e) => set("badge", e.target.value)} className={inputCls} placeholder="🍽️ Dine In" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Button Text</label>
                  <input type="text" value={modal.data.button_text} onChange={(e) => set("button_text", e.target.value)} className={inputCls} placeholder="Book Now" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Redirect URL</label>
                <input type="text" value={modal.data.href} onChange={(e) => set("href", e.target.value)} className={inputCls} placeholder="/book-table" />
              </div>

              {/* Color presets */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Color Theme</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESETS.map((p) => (
                    <button key={p.label} type="button" onClick={() => applyPreset(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, ${p.bg_from}, ${p.bg_to})`,
                        borderColor: p.accent_color,
                        color: p.accent_color,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Accent color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={modal.data.accent_color} onChange={(e) => set("accent_color", e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                      <input type="text" value={modal.data.accent_color} onChange={(e) => set("accent_color", e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">BG from</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={modal.data.bg_from} onChange={(e) => set("bg_from", e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                      <input type="text" value={modal.data.bg_from} onChange={(e) => set("bg_from", e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">BG to</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={modal.data.bg_to} onChange={(e) => set("bg_to", e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                      <input type="text" value={modal.data.bg_to} onChange={(e) => set("bg_to", e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Image */}
              <ImageUploadField
                label="Card Image (optional — replaces emoji)"
                value={modal.data.image_url}
                onChange={(url) => set("image_url", url)}
                folder="homepage-cards"
                hint="Square image recommended · replaces the emoji"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Sort Order</label>
                  <input type="number" value={modal.data.sort_order} onChange={(e) => set("sort_order", parseInt(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                  <select value={modal.data.is_active ? "active" : "inactive"} onChange={(e) => set("is_active", e.target.value === "active")}
                    className={`${inputCls} bg-white`}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={closeModal} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !modal.data.title.trim()}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
                {saving ? "Saving…" : modal.mode === "add" ? "Add card" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Delete card?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
