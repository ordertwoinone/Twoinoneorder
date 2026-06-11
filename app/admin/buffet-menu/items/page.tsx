"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Leaf, Star, Clock } from "lucide-react";

interface MenuSection {
  id: string;
  title: string;
  category_id: string;
}

interface BuffetTiming {
  id: string;
  label: string;
  time_range: string;
}

interface MenuItem {
  id: string;
  section_id: string;
  name: string;
  image_url: string;
  is_veg: boolean;
  is_special: boolean;
  timing_ids: string[];
  timing_qty: Record<string, number>;
  sort_order: number;
  is_active: boolean;
  buffet_menu_sections?: { title: string; category_id: string };
}

const EMPTY: Omit<MenuItem, "id" | "buffet_menu_sections"> = {
  section_id: "",
  name: "",
  image_url: "",
  is_veg: false,
  is_special: false,
  timing_ids: [],
  timing_qty: {},
  sort_order: 0,
  is_active: true,
};

export default function MenuItemsAdmin() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [timings, setTimings] = useState<BuffetTiming[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSection, setFilterSection] = useState<string>("all");
  const [modal, setModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    data: Omit<MenuItem, "id" | "buffet_menu_sections"> & { id?: string };
  }>({ open: false, mode: "add", data: { ...EMPTY } });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [itemsRes, sectionsRes, timingsRes] = await Promise.all([
      fetch("/api/admin/buffet-menu/items"),
      fetch("/api/admin/buffet-menu/sections"),
      fetch("/api/admin/buffet/timings"),
    ]);
    const [itemsData, sectionsData, timingsData] = await Promise.all([
      itemsRes.json(), sectionsRes.json(), timingsRes.json(),
    ]);
    setItems(Array.isArray(itemsData) ? itemsData : []);
    setSections(Array.isArray(sectionsData) ? sectionsData : []);
    setTimings(Array.isArray(timingsData) ? timingsData : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setModal({ open: true, mode: "add", data: { ...EMPTY, section_id: sections[0]?.id ?? "" } });
  }
  function openEdit(item: MenuItem) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { buffet_menu_sections: _, ...rest } = item;
    setModal({ open: true, mode: "edit", data: { ...rest, timing_ids: rest.timing_ids ?? [], timing_qty: rest.timing_qty ?? {} } });
  }
  function closeModal() { setModal((m) => ({ ...m, open: false })); }
  function handleField(key: string, value: unknown) {
    setModal((m) => ({ ...m, data: { ...m.data, [key]: value } }));
  }
  function toggleTiming(timingId: string) {
    const current = modal.data.timing_ids ?? [];
    const isChecked = current.includes(timingId);
    handleField("timing_ids", isChecked ? current.filter((id) => id !== timingId) : [...current, timingId]);
    if (isChecked) {
      // Remove qty entry when unchecking
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [timingId]: _removed, ...rest } = modal.data.timing_qty ?? {};
      handleField("timing_qty", rest);
    } else {
      // Default qty = 1 when newly checked
      handleField("timing_qty", { ...(modal.data.timing_qty ?? {}), [timingId]: 1 });
    }
  }

  function handleTimingQty(timingId: string, qty: number) {
    handleField("timing_qty", { ...(modal.data.timing_qty ?? {}), [timingId]: Math.max(1, qty || 1) });
  }

  async function handleSave() {
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { buffet_menu_sections: _, ...payload } = modal.data as MenuItem;
    if (modal.mode === "add") {
      await fetch("/api/admin/buffet-menu/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`/api/admin/buffet-menu/items/${modal.data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    closeModal();
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await fetch(`/api/admin/buffet-menu/items/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  const filtered = filterSection === "all" ? items : items.filter((i) => i.section_id === filterSection);

  function timingLabel(item: MenuItem) {
    const ids = item.timing_ids ?? [];
    if (ids.length === 0) return { text: "No timings", cls: "bg-gray-100 text-gray-500" };
    if (ids.length === timings.length) return { text: "All timings", cls: "bg-green-100 text-green-700" };
    return { text: `${ids.length}/${timings.length} timings`, cls: "bg-yellow-100 text-yellow-700" };
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Buffet Menu</p>
          <h1 className="text-2xl font-semibold text-gray-900">Menu Items</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""} across {sections.length} section{sections.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#ea580c" }}>
          <Plus size={16} /> Add item
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setFilterSection("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterSection === "all" ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          style={filterSection === "all" ? { background: "#ea580c" } : {}}>
          All sections ({items.length})
        </button>
        {sections.map((s) => {
          const count = items.filter((i) => i.section_id === s.id).length;
          return (
            <button key={s.id} onClick={() => setFilterSection(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterSection === s.id ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              style={filterSection === s.id ? { background: "#ea580c" } : {}}>
              {s.title} ({count})
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Image</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Section</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tags</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Timings</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">No items yet.</td></tr>
            ) : filtered.map((item) => {
              const tl = timingLabel(item);
              return (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-[10px]">No img</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{item.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.buffet_menu_sections?.title ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {item.is_veg && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                          <Leaf size={10} /> Veg
                        </span>
                      )}
                      {item.is_special && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
                          <Star size={10} /> Special
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tl.cls}`}>{tl.text}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(item)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => setDeleteId(item.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-base font-semibold text-gray-900">{modal.mode === "add" ? "Add item" : "Edit item"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Name</label>
                <input type="text" value={modal.data.name} onChange={(e) => handleField("name", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Chicken Tikka" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Section</label>
                <select value={modal.data.section_id} onChange={(e) => handleField("section_id", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  {sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700">Image URL</label>
                  <span className="text-[10px] text-orange-500 font-medium">Recommended: 400×400px · square</span>
                </div>
                <input type="url" value={modal.data.image_url} onChange={(e) => handleField("image_url", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="https://..." />
              </div>

              {/* Buffet Timings */}
              {timings.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock size={13} className="text-gray-400" />
                    <label className="text-xs font-semibold text-gray-700">Included in Timings</label>
                  </div>
                  <p className="text-[10px] text-gray-400 mb-2.5">
                    Check a timing to mark this item as included. Set the qty (default portions per guest).
                  </p>
                  <div className="space-y-2.5">
                    {timings.map((t) => {
                      const checked = (modal.data.timing_ids ?? []).includes(t.id);
                      const qty = (modal.data.timing_qty ?? {})[t.id] ?? 1;
                      return (
                        <div key={t.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${checked ? "border-orange-200 bg-orange-50" : "border-gray-100 bg-gray-50"}`}>
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${checked ? "border-orange-500 bg-orange-500" : "border-gray-300 hover:border-orange-400"}`}
                            onClick={() => toggleTiming(t.id)}
                          >
                            {checked && <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-none stroke-white stroke-[2]"><polyline points="1,4 4,7 9,1" /></svg>}
                          </div>
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleTiming(t.id)}>
                            <p className="text-sm font-medium text-gray-800 leading-tight">{t.label}</p>
                            <p className="text-[10px] text-gray-400">{t.time_range}</p>
                          </div>
                          {checked && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <label className="text-[10px] text-gray-500 font-medium">Qty</label>
                              <input
                                type="number"
                                min="1"
                                value={qty}
                                onChange={(e) => handleTimingQty(t.id, parseInt(e.target.value))}
                                className="w-14 px-2 py-1 rounded-lg border border-orange-200 text-xs text-center focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {(modal.data.timing_ids ?? []).length === 0 && (
                    <p className="text-[10px] text-gray-400 font-medium mt-2 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                      No timing checked — this item will show an Add to cart button for all sessions.
                    </p>
                  )}
                </div>
              )}

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
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={modal.data.is_veg} onChange={(e) => handleField("is_veg", e.target.checked)} className="w-4 h-4 rounded accent-green-600" />
                  <span className="text-sm font-medium text-gray-700">Vegetarian</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={modal.data.is_special} onChange={(e) => handleField("is_special", e.target.checked)} className="w-4 h-4 rounded accent-yellow-500" />
                  <span className="text-sm font-medium text-gray-700">Special dish</span>
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
              <button onClick={closeModal} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
                {saving ? "Saving..." : modal.mode === "add" ? "Add item" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-600" /></div>
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Delete item?</h3>
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
