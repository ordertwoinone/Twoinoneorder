"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import AddonGroupsEditor, { addonGroupsProblem, type EditableAddonGroup } from "@/components/admin/AddonGroupsEditor";
import BilingualField from "@/components/admin/BilingualField";
import ImageUploadField from "@/components/admin/ImageUploadField";
import type { DishBadge, Kitchen, Meal } from "@/data/kitchenDishes";
import { BADGE_LABELS, KITCHEN_LABELS, MEAL_LABELS, type KitchenDishRow } from "@/lib/kitchens";

type DishWithAddons = KitchenDishRow & { addon_groups?: EditableAddonGroup[] };

/** Number fields hold what is typed, so a half-entered value is not rewritten. */
type FormData = Omit<KitchenDishRow, "id" | "price" | "kcal" | "serves" | "badge" | "sort_order"> & {
  id?: string;
  price: string;
  kcal: string;
  serves: string;
  badge: DishBadge | "";
  sort_order: string;
  addon_groups: EditableAddonGroup[];
};

const EMPTY: FormData = {
  meal: "breakfast",
  kitchen: "italian",
  name: "",
  name_ar: "",
  description: "",
  description_ar: "",
  price: "",
  kcal: "",
  serves: "1",
  image_url: "",
  badge: "",
  is_healthy: false,
  is_high_protein: false,
  sort_order: "0",
  is_active: true,
  addon_groups: [],
};

const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
const labelCls = "block text-xs font-semibold text-gray-700 mb-1.5";

function toForm(item: DishWithAddons): FormData {
  return {
    ...item,
    price: String(item.price),
    kcal: item.kcal === null ? "" : String(item.kcal),
    serves: String(item.serves ?? 1),
    badge: item.badge ?? "",
    sort_order: String(item.sort_order),
    addon_groups: (item.addon_groups ?? []).map((g) => ({
      ...g,
      name_ar: g.name_ar ?? "",
      options: g.options.map((o) => ({ ...o, name_ar: o.name_ar ?? "", image_url: o.image_url ?? "" })),
    })),
  };
}

export default function KitchensAdmin() {
  const [items, setItems] = useState<DishWithAddons[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mealFilter, setMealFilter] = useState<Meal | "all">("all");
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; data: FormData }>({
    open: false, mode: "add", data: { ...EMPTY },
  });
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError("");
    const res = await fetch("/api/admin/kitchens");
    const data = await res.json().catch(() => null);
    if (res.ok && Array.isArray(data)) setItems(data);
    else setLoadError(data?.error ?? "Could not load the dishes.");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setFormError("");
    // Keeps the meal being browsed, since dishes tend to be added a meal at a time.
    setModal({ open: true, mode: "add", data: { ...EMPTY, meal: mealFilter === "all" ? EMPTY.meal : mealFilter } });
  }
  function openEdit(item: DishWithAddons) {
    setFormError("");
    setModal({ open: true, mode: "edit", data: toForm(item) });
  }
  function closeModal() { setModal((m) => ({ ...m, open: false })); }
  function handleField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setModal((m) => ({ ...m, data: { ...m.data, [key]: value } }));
  }

  async function handleSave() {
    const problem = addonGroupsProblem(modal.data.addon_groups);
    if (problem) {
      setFormError(problem);
      return;
    }
    setSaving(true);
    setFormError("");
    const res = await fetch(
      modal.mode === "add" ? "/api/admin/kitchens" : `/api/admin/kitchens/${modal.data.id}`,
      {
        method: modal.mode === "add" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modal.data),
      },
    );
    setSaving(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(data?.error ?? "Could not save this dish.");
      return;
    }
    /* The dish saved but its add-ons had nowhere to go. Stays open so that does
       not look like a clean save. */
    if (data?.droppedColumns?.length) {
      setFormError("The dish saved, but not its add-ons. Run supabase/kitchen_addons.sql in the Supabase SQL editor, then save again.");
      load();
      return;
    }
    closeModal();
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteError("");
    const res = await fetch(`/api/admin/kitchens/${deleteId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setDeleteError(data?.error ?? "Could not delete this dish.");
      return;
    }
    setDeleteId(null);
    load();
  }

  const visible = mealFilter === "all" ? items : items.filter((i) => i.meal === mealFilter);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Kitchens Page</p>
          <h1 className="text-2xl font-semibold text-gray-900">Dishes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} dish{items.length !== 1 ? "es" : ""} · the page shows samples until one is active</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#ea580c" }}>
          <Plus size={16} />
          Add dish
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "breakfast", "lunch", "dinner"] as const).map((id) => (
          <button
            key={id}
            onClick={() => setMealFilter(id)}
            aria-pressed={mealFilter === id}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mealFilter === id ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {id === "all" ? "All meals" : MEAL_LABELS[id]}
          </button>
        ))}
      </div>

      {loadError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
          <span className="block text-xs mt-1 text-red-600">If the table is missing, run supabase/kitchen_dishes.sql in the Supabase SQL editor.</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dish</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categories</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Arabic</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm">Loading...</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm">No dishes yet.</td></tr>
            ) : visible.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {item.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div>
                      <span className="block font-semibold text-gray-800">{item.name}</span>
                      {(item.addon_groups ?? []).length > 0 && (
                        <span className="block text-[11px] text-gray-500">
                          {item.addon_groups!.reduce((n, g) => n + g.options.length, 0)} add-ons
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{MEAL_LABELS[item.meal]} · {KITCHEN_LABELS[item.kitchen]} · Serves {item.serves ?? 1}</td>
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">AED {Number(item.price).toFixed(2)}</td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  {item.name_ar ? <span dir="rtl">{item.name_ar}</span> : <span className="text-amber-600">Missing</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {item.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(item)} aria-label={`Edit ${item.name}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => { setDeleteError(""); setDeleteId(item.id); }} aria-label={`Delete ${item.name}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-base font-semibold text-gray-900">{modal.mode === "add" ? "Add dish" : "Edit dish"}</h2>
              <button onClick={closeModal} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="kd-meal" className={labelCls}>Meal</label>
                  <select id="kd-meal" value={modal.data.meal} onChange={(e) => handleField("meal", e.target.value as Meal)} className={`${inputCls} bg-white`}>
                    {(Object.keys(MEAL_LABELS) as Meal[]).map((id) => <option key={id} value={id}>{MEAL_LABELS[id]}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="kd-kitchen" className={labelCls}>Kitchen</label>
                  <select id="kd-kitchen" value={modal.data.kitchen} onChange={(e) => handleField("kitchen", e.target.value as Kitchen)} className={`${inputCls} bg-white`}>
                    {(Object.keys(KITCHEN_LABELS) as Kitchen[]).map((id) => <option key={id} value={id}>{KITCHEN_LABELS[id]}</option>)}
                  </select>
                </div>
              </div>

              <BilingualField
                label="Name"
                value={modal.data.name}
                valueAr={modal.data.name_ar}
                onChange={(v) => handleField("name", v)}
                onChangeAr={(v) => handleField("name_ar", v)}
                placeholder="Basil Pasta"
              />
              <BilingualField
                label="Description"
                value={modal.data.description}
                valueAr={modal.data.description_ar}
                onChange={(v) => handleField("description", v)}
                onChangeAr={(v) => handleField("description_ar", v)}
                placeholder="Fresh basil sauce & a parmesan finish."
                multiline
                rows={2}
              />

              <ImageUploadField
                label="Dish Photo"
                value={modal.data.image_url}
                onChange={(url) => handleField("image_url", url)}
                folder="kitchens"
                hint="900×630px · landscape"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="kd-price" className={labelCls}>Price (AED)</label>
                  <input id="kd-price" type="number" min="0" step="0.01" value={modal.data.price} onChange={(e) => handleField("price", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="kd-kcal" className={labelCls}>Calories (optional)</label>
                  <input id="kd-kcal" type="number" min="0" step="1" value={modal.data.kcal} onChange={(e) => handleField("kcal", e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label htmlFor="kd-serves" className={labelCls}>Serves (people)</label>
                <input id="kd-serves" type="number" min="1" step="1" value={modal.data.serves} onChange={(e) => handleField("serves", e.target.value)} className={inputCls} />
                <p className="text-[11px] text-gray-500 mt-1">The menu lists dishes that match the size of the party first.</p>
              </div>

              <div>
                <label htmlFor="kd-badge" className={labelCls}>Photo badge</label>
                <select id="kd-badge" value={modal.data.badge} onChange={(e) => handleField("badge", e.target.value as DishBadge | "")} className={`${inputCls} bg-white`}>
                  <option value="">None</option>
                  {(Object.keys(BADGE_LABELS) as DishBadge[]).map((id) => <option key={id} value={id}>{BADGE_LABELS[id]}</option>)}
                </select>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={modal.data.is_healthy} onChange={(e) => handleField("is_healthy", e.target.checked)} />
                  Healthy choice
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={modal.data.is_high_protein} onChange={(e) => handleField("is_high_protein", e.target.checked)} />
                  High protein
                </label>
              </div>

              <AddonGroupsEditor
                groups={modal.data.addon_groups}
                onChange={(groups) => handleField("addon_groups", groups)}
                folder="kitchens"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="kd-order" className={labelCls}>Sort Order</label>
                  <input id="kd-order" type="number" step="1" value={modal.data.sort_order} onChange={(e) => handleField("sort_order", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="kd-status" className={labelCls}>Status</label>
                  <select id="kd-status" value={modal.data.is_active ? "active" : "inactive"} onChange={(e) => handleField("is_active", e.target.value === "active")} className={`${inputCls} bg-white`}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={closeModal} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
                {saving ? "Saving..." : modal.mode === "add" ? "Add dish" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Delete dish?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">This action cannot be undone.</p>
            {deleteError && <p role="alert" className="text-sm text-red-600 text-center mb-4">{deleteError}</p>}
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
