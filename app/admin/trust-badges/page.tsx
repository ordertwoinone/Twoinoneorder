"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Phone } from "lucide-react";

interface Badge {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  detail: string;
  is_call: boolean;
  sort_order: number;
  is_active: boolean;
}

const EMPTY: Omit<Badge, "id"> = {
  emoji: "⭐", title: "", subtitle: "", detail: "",
  is_call: false, sort_order: 0, is_active: true,
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function TrustBadgesAdmin() {
  const [items, setItems] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; data: Omit<Badge, "id"> & { id?: string } }>({
    open: false, mode: "add", data: { ...EMPTY },
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/trust-badges", { cache: "no-store" });
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setModal({ open: true, mode: "add", data: { ...EMPTY, sort_order: items.length + 1 } }); }
  function openEdit(b: Badge) { setModal({ open: true, mode: "edit", data: { ...b } }); }
  function closeModal() { setModal((m) => ({ ...m, open: false })); }
  function handleField(key: string, value: unknown) { setModal((m) => ({ ...m, data: { ...m.data, [key]: value } })); }

  async function handleSave() {
    setSaving(true);
    if (modal.mode === "add") {
      await fetch("/api/admin/trust-badges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(modal.data) });
    } else {
      await fetch(`/api/admin/trust-badges/${modal.data.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(modal.data) });
    }
    setSaving(false);
    closeModal();
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await fetch(`/api/admin/trust-badges/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Homepage</p>
          <h1 className="text-2xl font-semibold text-gray-900">Trust Badges</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} badge{items.length !== 1 ? "s" : ""} · the small cards with tap-to-open details</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#ea580c" }}>
          <Plus size={16} /> Add badge
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Icon</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subtitle</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">On tap</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">No badges yet.</td></tr>
            ) : items.map((b) => (
              <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-2xl">{b.emoji}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{b.title}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{b.subtitle}</td>
                <td className="px-4 py-3">
                  {b.is_call ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      <Phone size={11} /> Call
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Popup</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{b.sort_order}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${b.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {b.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(b)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => setDeleteId(b.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-semibold text-gray-900">{modal.mode === "add" ? "Add badge" : "Edit badge"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-[88px_1fr] gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Icon / Emoji</label>
                  <input type="text" value={modal.data.emoji} onChange={(e) => handleField("emoji", e.target.value)} className={`${inputCls} text-center text-xl`} placeholder="🛵" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title *</label>
                  <input type="text" value={modal.data.title} onChange={(e) => handleField("title", e.target.value)} className={inputCls} placeholder="Fast Delivery" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subtitle</label>
                <input type="text" value={modal.data.subtitle} onChange={(e) => handleField("subtitle", e.target.value)} className={inputCls} placeholder="15–40 min" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Popup Detail</label>
                <textarea value={modal.data.detail} onChange={(e) => handleField("detail", e.target.value)} rows={4}
                  className={`${inputCls} resize-y`}
                  placeholder="The text shown when the card is tapped…"
                  disabled={modal.data.is_call} />
                <p className="text-[11px] text-gray-400 mt-1.5">Shown in the popup. Ignored when “Tap to call” is on.</p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={modal.data.is_call} onChange={(e) => handleField("is_call", e.target.checked)} className="w-4 h-4 rounded accent-orange-500" />
                <span className="text-sm text-gray-700">Tap to call instead of opening a popup (uses the site phone number)</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Sort Order</label>
                  <input type="number" value={modal.data.sort_order} onChange={(e) => handleField("sort_order", parseInt(e.target.value) || 0)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                  <select value={modal.data.is_active ? "active" : "inactive"} onChange={(e) => handleField("is_active", e.target.value === "active")} className={`${inputCls} bg-white`}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={closeModal} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !modal.data.title} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
                {saving ? "Saving…" : modal.mode === "add" ? "Add badge" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-600" /></div>
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Delete badge?</h3>
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
