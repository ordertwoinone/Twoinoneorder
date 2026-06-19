"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, MapPin } from "lucide-react";

interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  maps_url: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY: Omit<Location, "id"> = {
  name: "", address: "", latitude: 0, longitude: 0,
  maps_url: "", sort_order: 0, is_active: true,
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function ContactLocationsAdmin() {
  const [items, setItems] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; data: Omit<Location, "id"> & { id?: string } }>({
    open: false, mode: "add", data: { ...EMPTY },
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/contact-locations", { cache: "no-store" });
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setModal({ open: true, mode: "add", data: { ...EMPTY, sort_order: items.length + 1 } }); }
  function openEdit(l: Location) { setModal({ open: true, mode: "edit", data: { ...l } }); }
  function closeModal() { setModal((m) => ({ ...m, open: false })); }
  function handleField(key: string, value: unknown) { setModal((m) => ({ ...m, data: { ...m.data, [key]: value } })); }

  async function handleSave() {
    setSaving(true);
    if (modal.mode === "add") {
      await fetch("/api/admin/contact-locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(modal.data) });
    } else {
      await fetch(`/api/admin/contact-locations/${modal.data.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(modal.data) });
    }
    setSaving(false);
    closeModal();
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await fetch(`/api/admin/contact-locations/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  // Pull "lat,lng" straight out of a pasted Google Maps URL/embed if possible
  function fillFromMapsUrl(url: string) {
    handleField("maps_url", url);
    const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const bang = url.match(/!3d(-?\d+\.\d+)!2d(-?\d+\.\d+)/) || url.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
    const q = url.match(/query=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (at) { handleField("latitude", parseFloat(at[1])); handleField("longitude", parseFloat(at[2])); }
    else if (q) { handleField("latitude", parseFloat(q[1])); handleField("longitude", parseFloat(q[2])); }
    else if (bang) {
      // !3d is latitude, !2d is longitude
      const lat = url.match(/!3d(-?\d+\.\d+)/);
      const lng = url.match(/!2d(-?\d+\.\d+)/);
      if (lat) handleField("latitude", parseFloat(lat[1]));
      if (lng) handleField("longitude", parseFloat(lng[1]));
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Contact Page</p>
          <h1 className="text-2xl font-semibold text-gray-900">Map Locations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} branch{items.length !== 1 ? "es" : ""} · pins shown on the contact page map</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#ea580c" }}>
          <Plus size={16} /> Add location
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Coordinates</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm">No locations yet.</td></tr>
            ) : items.map((l) => (
              <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-gray-900">{l.name}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{l.address}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{l.sort_order}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${l.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {l.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(l)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => setDeleteId(l.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
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
              <h2 className="text-base font-semibold text-gray-900">{modal.mode === "add" ? "Add location" : "Edit location"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Restaurant Name *</label>
                <input type="text" value={modal.data.name} onChange={(e) => handleField("name", e.target.value)} className={inputCls} placeholder="Two in One Turkish Restaurant" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Address</label>
                <input type="text" value={modal.data.address} onChange={(e) => handleField("address", e.target.value)} className={inputCls} placeholder="Kalba, Sharjah" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Google Maps link (paste to auto-fill coordinates)</label>
                <input type="text" value={modal.data.maps_url} onChange={(e) => fillFromMapsUrl(e.target.value)} className={inputCls} placeholder="https://maps.google.com/...  or  the embed URL" />
                <p className="text-[11px] text-gray-400 mt-1.5">Paste a Google Maps URL or embed link — latitude &amp; longitude fill in automatically.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Latitude *</label>
                  <input type="number" step="any" value={modal.data.latitude} onChange={(e) => handleField("latitude", parseFloat(e.target.value) || 0)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Longitude *</label>
                  <input type="number" step="any" value={modal.data.longitude} onChange={(e) => handleField("longitude", parseFloat(e.target.value) || 0)} className={inputCls} />
                </div>
              </div>

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
              <button onClick={handleSave} disabled={saving || !modal.data.name} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
                {saving ? "Saving…" : modal.mode === "add" ? "Add location" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><MapPin size={22} className="text-red-600" /></div>
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Delete location?</h3>
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
