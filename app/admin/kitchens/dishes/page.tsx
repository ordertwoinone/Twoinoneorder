"use client";
import { useEffect, useState } from "react";
import { FileSpreadsheet, Plus, Pencil, Star, Trash2, X } from "lucide-react";
import AddonGroupsEditor, { addonGroupsProblem, type EditableAddonGroup } from "@/components/admin/AddonGroupsEditor";
import BilingualField from "@/components/admin/BilingualField";
import ImageUploadField from "@/components/admin/ImageUploadField";
import type { DishBadge, Kitchen, Meal } from "@/data/kitchenDishes";
import { BADGE_LABELS, COOKING_KITCHENS, KITCHEN_LABELS, MEAL_LABELS, type KitchenCategoryRow, type KitchenDishRow } from "@/lib/kitchens";
import ImportDialog from "./ImportDialog";

type DishWithAddons = KitchenDishRow & { addon_groups?: EditableAddonGroup[] };

/** Number fields hold what is typed, so a half-entered value is not rewritten. */
type FormData = Omit<KitchenDishRow, "id" | "price" | "kcal" | "serves" | "badge" | "sort_order" | "category_ids"> & {
  id?: string;
  category_ids: string[];
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
  category_ids: [],
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
    category_ids: item.category_ids ?? [],
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
  const [categories, setCategories] = useState<KitchenCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mealFilter, setMealFilter] = useState<Meal | "all" | "favorites">("all");
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; data: FormData }>({
    open: false, mode: "add", data: { ...EMPTY },
  });
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkError, setBulkError] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    const res = await fetch("/api/admin/kitchens/dishes");
    const data = await res.json().catch(() => null);
    if (res.ok && Array.isArray(data)) setItems(data);
    else setLoadError(data?.error ?? "Could not load the dishes.");
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Before supabase/kitchen_categories.sql has run there are none to pick.
    fetch("/api/admin/kitchens/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => { if (Array.isArray(data)) setCategories(data); })
      .catch(() => {});
  }, []);

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  function toggleCategory(id: string) {
    const current = modal.data.category_ids;
    handleField("category_ids", current.includes(id) ? current.filter((c) => c !== id) : [...current, id]);
  }

  function openAdd() {
    setFormError("");
    // Keeps the meal being browsed, since dishes tend to be added a meal at a time.
    const meal = mealFilter === "all" || mealFilter === "favorites" ? EMPTY.meal : mealFilter;
    setModal({ open: true, mode: "add", data: { ...EMPTY, meal, kitchen: meal === "cafe" ? "cafe" : EMPTY.kitchen } });
  }
  function openEdit(item: DishWithAddons) {
    setFormError("");
    setModal({ open: true, mode: "edit", data: toForm(item) });
  }
  /* A cafe dish has no kitchen of its own, so one moved out of the cafe needs one again. */
  function changeFormMeal(meal: Meal) {
    setModal((m) => ({
      ...m,
      data: {
        ...m.data,
        meal,
        kitchen: meal === "cafe" ? "cafe" : m.data.kitchen === "cafe" ? "italian" : m.data.kitchen,
      },
    }));
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
      modal.mode === "add" ? "/api/admin/kitchens/dishes" : `/api/admin/kitchens/dishes/${modal.data.id}`,
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
    // The column was shed because the database does not have it yet.
    if (modal.data.category_ids.length > 0 && data && !("category_ids" in data)) {
      setFormError("The dish saved, but not its categories. Run supabase/kitchen_categories.sql in the Supabase SQL editor, then save again.");
      load();
      return;
    }
    closeModal();
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteError("");
    const res = await fetch(`/api/admin/kitchens/dishes/${deleteId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setDeleteError(data?.error ?? "Could not delete this dish.");
      return;
    }
    setDeleteId(null);
    load();
  }

  const visible =
    mealFilter === "all" ? items
    : mealFilter === "favorites" ? items.filter((i) => i.is_favorite)
    : items.filter((i) => i.meal === mealFilter);
  const favoriteCount = items.filter((i) => i.is_favorite).length;

  /* Shows straight away, and goes back if the save fails. */
  async function toggleFavorite(item: DishWithAddons) {
    const next = !item.is_favorite;
    const setStar = (value: boolean) =>
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_favorite: value } : i)));
    setStar(next);
    setFavoriteError("");
    const res = await fetch(`/api/admin/kitchens/dishes/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorite: next }),
    }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setStar(!next);
      setFavoriteError(data?.error ?? "Could not save that favourite.");
    }
  }
  const allSelected = visible.length > 0 && visible.every((i) => selected.has(i.id));

  /* Changing the filter clears the ticks, so nothing out of sight can be deleted. */
  function changeMeal(id: Meal | "all" | "favorites") {
    setMealFilter(id);
    setSelected(new Set());
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    setBulkError("");
    const res = await fetch("/api/admin/kitchens/dishes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBulkDeleting(false);
    if (!res?.ok) {
      setBulkError(data?.error ?? "Could not delete these dishes.");
      // Some may have gone before the failure, so the list has to be re-read.
      if (data?.deleted) load();
      return;
    }
    setSelected(new Set());
    setBulkOpen(false);
    load();
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Kitchens Page</p>
          <h1 className="text-2xl font-semibold text-gray-900">Dishes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} dish{items.length !== 1 ? "es" : ""} · the page shows samples until one is active</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setImporting(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
            <FileSpreadsheet size={16} />
            Import from Excel
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#ea580c" }}>
            <Plus size={16} />
            Add dish
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "breakfast", "lunch", "dinner", "cafe"] as const).map((id) => (
          <button
            key={id}
            onClick={() => changeMeal(id)}
            aria-pressed={mealFilter === id}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mealFilter === id ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {id === "all" ? "All meals" : MEAL_LABELS[id]}
          </button>
        ))}
        <button
          onClick={() => changeMeal("favorites")}
          aria-pressed={mealFilter === "favorites"}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mealFilter === "favorites" ? "bg-amber-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          <Star size={12} fill="currentColor" />
          Favourites ({favoriteCount})
        </button>
      </div>

      {loadError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
          <span className="block text-xs mt-1 text-red-600">If the table is missing, run supabase/kitchen_dishes.sql in the Supabase SQL editor.</span>
        </div>
      )}

      {favoriteError && <p role="alert" className="mb-3 text-sm text-red-600">{favoriteError}</p>}

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <p className="text-sm font-semibold text-red-800">{selected.size} selected</p>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50">Clear</button>
            <button onClick={() => { setBulkError(""); setBulkOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700">
              <Trash2 size={14} />
              Delete selected
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-10 ps-4 py-3 text-left">
                <input
                  type="checkbox"
                  aria-label="Select all dishes shown"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = selected.size > 0 && !allSelected; }}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(visible.map((i) => i.id)))}
                  className="w-4 h-4 align-middle"
                />
              </th>
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
              <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">Loading...</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">{mealFilter === "favorites" ? "No favourites yet. Tap a star to add one." : "No dishes yet."}</td></tr>
            ) : visible.map((item) => (
              <tr key={item.id} className={`border-b border-gray-100 transition-colors ${selected.has(item.id) ? "bg-red-50/50" : "hover:bg-gray-50"}`}>
                <td className="ps-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${item.name}`}
                    checked={selected.has(item.id)}
                    onChange={() => toggleOne(item.id)}
                    className="w-4 h-4 align-middle"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <button
                      onClick={() => toggleFavorite(item)}
                      aria-pressed={Boolean(item.is_favorite)}
                      aria-label={`${item.is_favorite ? "Remove" : "Add"} ${item.name} ${item.is_favorite ? "from" : "to"} favourites`}
                      title={item.is_favorite ? "Remove from favourites" : "Add to favourites"}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-amber-50 ${item.is_favorite ? "text-amber-500" : "text-gray-300 hover:text-amber-500"}`}
                    >
                      <Star size={18} fill={item.is_favorite ? "currentColor" : "none"} />
                    </button>
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
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                  {item.meal === "cafe" ? MEAL_LABELS.cafe : `${MEAL_LABELS[item.meal]} · ${KITCHEN_LABELS[item.kitchen]}`} · Serves {item.serves ?? 1}
                  {(item.category_ids ?? []).some((id) => categoryName.has(id)) && (
                    <span className="block text-[11px] text-gray-500">
                      {(item.category_ids ?? []).filter((id) => categoryName.has(id)).map((id) => categoryName.get(id)).join(", ")}
                    </span>
                  )}
                </td>
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
                  <select id="kd-meal" value={modal.data.meal} onChange={(e) => changeFormMeal(e.target.value as Meal)} className={`${inputCls} bg-white`}>
                    {(Object.keys(MEAL_LABELS) as Meal[]).map((id) => <option key={id} value={id}>{MEAL_LABELS[id]}</option>)}
                  </select>
                </div>
                {modal.data.meal === "cafe" ? (
                  <p className="self-end pb-2.5 text-xs text-gray-500">Cafe dishes are one menu, with no kitchen to choose.</p>
                ) : (
                  <div>
                    <label htmlFor="kd-kitchen" className={labelCls}>Kitchen</label>
                    <select id="kd-kitchen" value={modal.data.kitchen} onChange={(e) => handleField("kitchen", e.target.value as Kitchen)} className={`${inputCls} bg-white`}>
                      {COOKING_KITCHENS.map((id) => <option key={id} value={id}>{KITCHEN_LABELS[id]}</option>)}
                    </select>
                  </div>
                )}
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

              <fieldset>
                <legend className={labelCls}>Categories</legend>
                {categories.length === 0 ? (
                  <p className="text-[11px] text-gray-500">
                    None yet. Add them in Kitchens Page → Categories, then tick the ones this dish belongs to.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => {
                      const on = modal.data.category_ids.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCategory(c.id)}
                          aria-pressed={on}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${on ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                        >
                          {c.name}{!c.is_active && " (hidden)"}
                        </button>
                      );
                    })}
                  </div>
                )}
              </fieldset>

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

      {importing && <ImportDialog onClose={() => setImporting(false)} onImported={load} />}

      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Delete {selected.size} dish{selected.size !== 1 ? "es" : ""}?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Their add-ons go too, and this cannot be undone. Past orders keep their details.</p>
            {bulkError && <p role="alert" className="text-sm text-red-600 text-center mb-4">{bulkError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setBulkOpen(false)} disabled={bulkDeleting} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleBulkDelete} disabled={bulkDeleting} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50">{bulkDeleting ? "Deleting..." : "Delete"}</button>
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
