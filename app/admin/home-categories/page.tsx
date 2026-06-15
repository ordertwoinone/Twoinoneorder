"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, GripVertical, ExternalLink } from "lucide-react";

interface Category {
  id: string;
  name: string;
  emoji: string;
  image_url: string;
  href: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY: Omit<Category, "id"> = {
  name: "",
  emoji: "🍽️",
  image_url: "",
  href: "",
  sort_order: 0,
  is_active: true,
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

const SUGGESTED = [
  { emoji: "🫓", name: "Arabic" },
  { emoji: "🍛", name: "Indian" },
  { emoji: "🥡", name: "Chinese" },
  { emoji: "🧆", name: "Egyptian" },
  { emoji: "🥩", name: "Grilled" },
  { emoji: "🥪", name: "Sandwich" },
  { emoji: "🍕", name: "Pizza" },
  { emoji: "🥗", name: "Salads" },
  { emoji: "☕", name: "Drinks" },
  { emoji: "🍰", name: "Desserts" },
  { emoji: "🍜", name: "Noodles" },
  { emoji: "🌮", name: "Wraps" },
];

export default function HomeCategoriesAdmin() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    data: Omit<Category, "id"> & { id?: string };
  }>({ open: false, mode: "add", data: { ...EMPTY } });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/home-categories");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setModal({ open: true, mode: "add", data: { ...EMPTY, sort_order: items.length + 1 } });
  }
  function openEdit(item: Category) {
    setModal({ open: true, mode: "edit", data: { ...item } });
  }
  function closeModal() {
    setModal((m) => ({ ...m, open: false }));
  }
  function handleField(key: string, value: unknown) {
    setModal((m) => ({ ...m, data: { ...m.data, [key]: value } }));
  }

  async function handleSave() {
    setSaving(true);
    if (modal.mode === "add") {
      await fetch("/api/admin/home-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modal.data),
      });
    } else {
      await fetch(`/api/admin/home-categories/${modal.data.id}`, {
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
    await fetch(`/api/admin/home-categories/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  async function toggleActive(item: Category) {
    await fetch(`/api/admin/home-categories/${item.id}`, {
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
          <h1 className="text-2xl font-semibold text-gray-900">Cuisine Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.filter((i) => i.is_active).length} active ·{" "}
            Scrollable row shown below the hero banner
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#ea580c" }}
        >
          <Plus size={16} />
          Add category
        </button>
      </div>

      {/* Live preview */}
      {items.filter((i) => i.is_active).length > 0 && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Live Preview
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items
              .filter((i) => i.is_active)
              .map((cat) => (
                <div key={cat.id} className="shrink-0 flex flex-col items-center gap-2 w-[68px]">
                  {/* Square image — matches the live site */}
                  <div className="relative w-[68px] h-[68px] rounded-2xl overflow-hidden shadow-sm bg-orange-50">
                    {cat.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-2xl">
                        {cat.emoji}
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/40 to-transparent" />
                    {cat.href && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center" title={cat.href}>
                        <ExternalLink size={8} className="text-white" />
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] font-bold text-center w-full leading-tight truncate ${cat.href ? "text-gray-800" : "text-gray-400"}`}>
                    {cat.name}
                  </p>
                </div>
              ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Categories with a redirect URL show an{" "}
            <ExternalLink size={10} className="inline -mt-0.5 text-orange-500" /> badge and are clickable on the live site.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10"></th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Category
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                Redirect URL
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Order
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-gray-400 text-sm">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-gray-400 text-sm">
                  No categories yet — add one above.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-3 text-gray-300">
                    <GripVertical size={16} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-xl shrink-0">
                        {item.emoji}
                      </span>
                      <span className="font-semibold text-gray-800">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {item.href ? (
                      <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded truncate max-w-[160px] block">
                        {item.href}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.sort_order}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(item)}
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors ${
                        item.is_active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {item.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(item)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(item.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                {modal.mode === "add" ? "Add category" : "Edit category"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Emoji + name row */}
              <div className="grid grid-cols-[72px_1fr] gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={modal.data.emoji}
                    onChange={(e) => handleField("emoji", e.target.value)}
                    className="w-full px-2 py-2.5 rounded-lg border border-gray-200 text-2xl text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="🍽️"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={modal.data.name}
                    onChange={(e) => handleField("name", e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Arabic"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Image URL <span className="font-normal text-gray-400">(Unsplash or upload link)</span>
                </label>
                <input
                  type="text"
                  value={modal.data.image_url}
                  onChange={(e) => handleField("image_url", e.target.value)}
                  className={inputCls}
                  placeholder="https://images.unsplash.com/photo-..."
                />
                {modal.data.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={modal.data.image_url}
                    alt="preview"
                    className="mt-2 w-16 h-16 rounded-xl object-cover border border-gray-200"
                  />
                )}
              </div>

              {/* Redirect URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Redirect URL <span className="font-normal text-gray-400">(where clicking takes the user)</span>
                </label>
                <input
                  type="text"
                  value={modal.data.href}
                  onChange={(e) => handleField("href", e.target.value)}
                  className={inputCls}
                  placeholder="e.g. /restaurant/university-kalba or https://..."
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Use a path like <code className="bg-gray-100 px-1 rounded">/restaurant/buffet</code> for internal pages, or a full URL for external links.
                </p>
              </div>

              {/* Quick pick */}
              {modal.mode === "add" && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Quick pick</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED.map((s) => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() =>
                          setModal((m) => ({
                            ...m,
                            data: { ...m.data, emoji: s.emoji, name: s.name },
                          }))
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                      >
                        {s.emoji} {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={modal.data.sort_order}
                    onChange={(e) => handleField("sort_order", parseInt(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={modal.data.is_active ? "active" : "inactive"}
                    onChange={(e) => handleField("is_active", e.target.value === "active")}
                    className={`${inputCls} bg-white`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !modal.data.name.trim()}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#ea580c" }}
              >
                {saving
                  ? "Saving…"
                  : modal.mode === "add"
                  ? "Add category"
                  : "Save changes"}
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
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">
              Delete category?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
