"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";

interface BuffetTiming {
  id: string;
  label: string;
  time_range: string;
  price: string;
  price_label: string;
  theme: "orange" | "violet" | "pink";
  sort_order: number;
  is_active: boolean;
}

const EMPTY: Omit<BuffetTiming, "id"> = {
  label: "",
  time_range: "",
  price: "",
  price_label: "/ person",
  theme: "orange",
  sort_order: 0,
  is_active: true,
};

const THEME_MAP: Record<string, { bg: string; text: string; label: string }> = {
  orange: { bg: "bg-orange-50",  text: "text-orange-500",  label: "Orange" },
  violet: { bg: "bg-violet-50",  text: "text-violet-600",  label: "Violet" },
  pink:   { bg: "bg-pink-50",    text: "text-pink-500",    label: "Pink"   },
};

export default function BuffetTimingsAdmin() {
  const [items, setItems] = useState<BuffetTiming[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; data: Omit<BuffetTiming, "id"> & { id?: string } }>({
    open: false, mode: "add", data: { ...EMPTY },
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/buffet/timings");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setModal({ open: true, mode: "add", data: { ...EMPTY } }); }
  function openEdit(item: BuffetTiming) { setModal({ open: true, mode: "edit", data: { ...item } }); }
  function closeModal() { setModal((m) => ({ ...m, open: false })); }
  function handleField(key: string, value: unknown) {
    setModal((m) => ({ ...m, data: { ...m.data, [key]: value } }));
  }

  async function handleSave() {
    setSaving(true);
    if (modal.mode === "add") {
      await fetch("/api/admin/buffet/timings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modal.data),
      });
    } else {
      await fetch(`/api/admin/buffet/timings/${modal.data.id}`, {
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
    await fetch(`/api/admin/buffet/timings/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Buffet Page</p>
          <h1 className="text-2xl font-semibold text-gray-900">Buffet Timings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} session{items.length !== 1 ? "s" : ""} · Lunch, Dinner, Brunch, etc.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#ea580c" }}
        >
          <Plus size={16} />
          Add timing
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Theme</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Label</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">No timings yet.</td></tr>
            ) : items.map((item) => {
              const t = THEME_MAP[item.theme] ?? THEME_MAP.orange;
              return (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${t.bg} ${t.text}`}>
                      {t.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{item.label}</td>
                  <td className="px-4 py-3 text-gray-500">{item.time_range}</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{item.price} <span className="font-normal text-xs text-gray-400">{item.price_label}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.sort_order}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                {modal.mode === "add" ? "Add timing" : "Edit timing"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Label</label>
                <input type="text" value={modal.data.label} onChange={(e) => handleField("label", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Lunch Buffet" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Time Range</label>
                <input type="text" value={modal.data.time_range} onChange={(e) => handleField("time_range", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="12:00 PM – 4:00 PM" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Price</label>
                  <input type="text" value={modal.data.price} onChange={(e) => handleField("price", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="KD 6.900" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Price Label</label>
                  <input type="text" value={modal.data.price_label} onChange={(e) => handleField("price_label", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="/ person" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Color Theme</label>
                <div className="flex gap-3">
                  {(["orange", "violet", "pink"] as const).map((t) => {
                    const cfg = THEME_MAP[t];
                    const selected = modal.data.theme === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleField("theme", t)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${cfg.bg} ${cfg.text} ${selected ? "border-current" : "border-transparent opacity-60 hover:opacity-90"}`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Sort Order</label>
                  <input type="number" value={modal.data.sort_order} onChange={(e) => handleField("sort_order", parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                  <select value={modal.data.is_active ? "active" : "inactive"} onChange={(e) => handleField("is_active", e.target.value === "active")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={closeModal} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
                {saving ? "Saving..." : modal.mode === "add" ? "Add timing" : "Save changes"}
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
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Delete timing?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">This action cannot be undone.</p>
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
