"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Search, Star, Clock } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  cuisine: string[];
  logo_url: string;
  food_image_url: string;
  rating: number;
  delivery_time: string;
  url: string;
  badge: string | null;
  is_active: boolean;
  created_at: string;
}

const EMPTY: Omit<Restaurant, "id" | "created_at"> = {
  name: "", slug: "", cuisine: [], logo_url: "", food_image_url: "",
  rating: 4.5, delivery_time: "20-30 min", url: "", badge: null, is_active: true,
};

const BADGES = ["", "Free Delivery", "Best Seller", "Popular", "New"];
const BADGE_COLOR: Record<string, string> = {
  "Free Delivery": "bg-green-100 text-green-700",
  "Best Seller":   "bg-orange-100 text-orange-700",
  "Popular":       "bg-red-100 text-red-700",
  "New":           "bg-purple-100 text-purple-700",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function RestaurantsAdmin() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; data: Omit<Restaurant, "id" | "created_at"> & { id?: string } }>({
    open: false, mode: "add", data: { ...EMPTY },
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cuisineInput, setCuisineInput] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/restaurants");
    setRestaurants(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setModal({ open: true, mode: "add", data: { ...EMPTY } }); setCuisineInput(""); }
  function openEdit(r: Restaurant) { setModal({ open: true, mode: "edit", data: { ...r } }); setCuisineInput(r.cuisine?.join(", ") || ""); }
  function closeModal() { setModal((m) => ({ ...m, open: false })); }
  function handleField(key: string, value: unknown) { setModal((m) => ({ ...m, data: { ...m.data, [key]: value } })); }

  async function handleSave() {
    setSaving(true);
    const payload = {
      ...modal.data,
      cuisine: cuisineInput.split(",").map((s) => s.trim()).filter(Boolean),
      slug: modal.data.slug || slugify(modal.data.name),
    };
    if (modal.mode === "add") {
      await fetch("/api/admin/restaurants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch(`/api/admin/restaurants/${modal.data.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setSaving(false);
    closeModal();
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await fetch(`/api/admin/restaurants/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  const filtered = restaurants.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.cuisine?.join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Restaurants</h1>
          <p className="text-sm text-gray-500 mt-0.5">{restaurants.length} total</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#ea580c" }}>
          <Plus size={16} /> Add restaurant
        </button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search restaurants..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Restaurant</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cuisine</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Badge</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">{search ? "No results found." : "No restaurants yet."}</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {r.food_image_url
                        ? <img src={r.food_image_url} alt={r.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gray-200" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.cuisine?.join(", ") || "—"}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-amber-500 font-semibold text-xs">
                    <Star size={11} className="fill-amber-400 stroke-amber-400" />{r.rating}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-gray-500 text-xs">
                    <Clock size={11} />{r.delivery_time}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {r.badge
                    ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${BADGE_COLOR[r.badge] || "bg-gray-100 text-gray-600"}`}>{r.badge}</span>
                    : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${r.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {r.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(r)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => setDeleteId(r.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-semibold text-gray-900">{modal.mode === "add" ? "Add restaurant" : "Edit restaurant"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Name *</label>
                <input type="text" value={modal.data.name}
                  onChange={(e) => { handleField("name", e.target.value); if (modal.mode === "add") handleField("slug", slugify(e.target.value)); }}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Restaurant name" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Slug *</label>
                <input type="text" value={modal.data.slug} onChange={(e) => handleField("slug", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono"
                  placeholder="restaurant-slug" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Cuisine <span className="font-normal text-gray-400">(comma-separated)</span></label>
                <input type="text" value={cuisineInput} onChange={(e) => setCuisineInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Arabic, Indian, Continental" />
              </div>

              <ImageUploadField label="Logo" value={modal.data.logo_url} onChange={(url) => handleField("logo_url", url)} folder="logos" hint="200×200px · square" />
              <ImageUploadField label="Food Image" value={modal.data.food_image_url} onChange={(url) => handleField("food_image_url", url)} folder="restaurants" hint="800×500px · right side of card" />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rating</label>
                  <input type="number" min="0" max="5" step="0.1" value={modal.data.rating} onChange={(e) => handleField("rating", parseFloat(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Delivery Time</label>
                  <input type="text" value={modal.data.delivery_time} onChange={(e) => handleField("delivery_time", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="20-30 min" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Order URL</label>
                <input type="url" value={modal.data.url} onChange={(e) => handleField("url", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="https://..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Badge</label>
                  <select value={modal.data.badge || ""} onChange={(e) => handleField("badge", e.target.value || null)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                    {BADGES.map((b) => <option key={b} value={b}>{b || "None"}</option>)}
                  </select>
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

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={closeModal} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !modal.data.name} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
                {saving ? "Saving..." : modal.mode === "add" ? "Add restaurant" : "Save changes"}
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
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Delete restaurant?</h3>
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
