"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

interface Banner {
  id: string;
  tag: string;
  headline_orange: string;
  headline_black: string;
  subtitle: string;
  cta_text: string;
  cta_href: string;
  bg_color: string;
  accent_color: string;
  food_image_url: string;
  food_alt: string;
  sort_order: number;
  is_active: boolean;
  platform: "mobile" | "web";
}

const EMPTY: Omit<Banner, "id"> = {
  tag: "",
  headline_orange: "",
  headline_black: "",
  subtitle: "",
  cta_text: "Order Now",
  cta_href: "",
  bg_color: "#fff8f2",
  accent_color: "#ea580c",
  food_image_url: "",
  food_alt: "",
  sort_order: 0,
  is_active: true,
  platform: "mobile",
};

export default function BannersAdmin() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; data: Omit<Banner, "id"> & { id?: string } }>({
    open: false, mode: "add", data: { ...EMPTY },
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"mobile" | "web">("mobile");

  const shown = banners.filter((b) => (b.platform || "mobile") === tab);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/banners");
    setBanners(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setModal({ open: true, mode: "add", data: { ...EMPTY, platform: tab } }); }
  function openEdit(b: Banner) { setModal({ open: true, mode: "edit", data: { ...b } }); }
  function closeModal() { setModal((m) => ({ ...m, open: false })); }
  function handleField(key: string, value: unknown) {
    setModal((m) => ({ ...m, data: { ...m.data, [key]: value } }));
  }

  async function handleSave() {
    setSaving(true);
    if (modal.mode === "add") {
      await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modal.data),
      });
    } else {
      await fetch(`/api/admin/banners/${modal.data.id}`, {
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
    await fetch(`/api/admin/banners/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Hero Banners</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {shown.length} {tab === "web" ? "web" : "mobile"} slide{shown.length !== 1 ? "s" : ""} · shown in order
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#ea580c" }}
        >
          <Plus size={16} />
          Add {tab} banner
        </button>
      </div>

      {/* Platform tabs — Mobile and Web banners are managed separately */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(["mobile", "web"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold capitalize transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tag</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Headline</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">CTA</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">Loading...</td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">No {tab} banners yet.</td></tr>
            ) : shown.map((b) => (
              <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div
                    className="w-16 h-10 rounded-lg overflow-hidden flex items-center justify-center text-xs font-bold"
                    style={{ background: b.bg_color, color: b.accent_color }}
                  >
                    {b.food_image_url
                      ? <img src={b.food_image_url} alt="" className="w-full h-full object-cover" />
                      : b.tag?.slice(0, 3)
                    }
                  </div>
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-gray-600">{b.tag || "—"}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold" style={{ color: b.accent_color }}>{b.headline_orange}</p>
                  <p className="text-xs text-gray-600">{b.headline_black}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{b.cta_text}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{b.sort_order}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${b.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {b.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(b)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteId(b.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
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
              <h2 className="text-base font-semibold text-gray-900 capitalize">
                {modal.mode === "add" ? `Add ${modal.data.platform} banner` : `Edit ${modal.data.platform} banner`}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tag / Brand</label>
                  <input type="text" value={modal.data.tag} onChange={(e) => handleField("tag", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="FALAFEL AL NILE" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Sort Order</label>
                  <input type="number" value={modal.data.sort_order} onChange={(e) => handleField("sort_order", parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Headline (colored)</label>
                  <input type="text" value={modal.data.headline_orange} onChange={(e) => handleField("headline_orange", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="20% EXTRA" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Headline (black)</label>
                  <input type="text" value={modal.data.headline_black} onChange={(e) => handleField("headline_black", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="DISCOUNT" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subtitle</label>
                <textarea value={modal.data.subtitle} onChange={(e) => handleField("subtitle", e.target.value)} rows={2}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  placeholder="Description text..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">CTA Text</label>
                  <input type="text" value={modal.data.cta_text} onChange={(e) => handleField("cta_text", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Order Now" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">CTA Link</label>
                  <input type="text" value={modal.data.cta_href} onChange={(e) => handleField("cta_href", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="https://..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Background Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={modal.data.bg_color} onChange={(e) => handleField("bg_color", e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1" />
                    <input type="text" value={modal.data.bg_color} onChange={(e) => handleField("bg_color", e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Accent Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={modal.data.accent_color} onChange={(e) => handleField("accent_color", e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1" />
                    <input type="text" value={modal.data.accent_color} onChange={(e) => handleField("accent_color", e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono" />
                  </div>
                </div>
              </div>

              <ImageUploadField
                label="Banner Image"
                value={modal.data.food_image_url}
                onChange={(url) => handleField("food_image_url", url)}
                folder="banners"
                hint={
                  modal.data.platform === "web"
                    ? "Web: food cutout (transparent PNG) ~700×500px — shown on the right with the text on the left"
                    : "Mobile: full banner image ~600×700px (portrait) — the Order button is added automatically"
                }
              />

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Image Alt Text</label>
                <input type="text" value={modal.data.food_alt} onChange={(e) => handleField("food_alt", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Descriptive alt text" />
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

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={closeModal} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
                {saving ? "Saving..." : modal.mode === "add" ? "Add banner" : "Save changes"}
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
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Delete banner?</h3>
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
