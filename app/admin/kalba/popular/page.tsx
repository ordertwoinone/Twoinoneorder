"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, GripVertical, ChevronUp, ChevronDown, Ruler } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import PicksField from "@/components/admin/PicksField";
import PicksToggle from "@/components/admin/PicksToggle";
import BilingualField from "@/components/admin/BilingualField";

interface Category {
  id: string;
  emoji: string;
  label: string;
}

/** One answer to a choice group. Blank id = not saved yet. */
interface Addon {
  id?: string;
  name: string;
  name_ar: string;
  /** Optional thumbnail shown beside the option. */
  image_url: string;
  price: number | string;
  sort_order: number;
}

/** A question the shopper is asked — "Choice of Side item" — and its answers. */
interface AddonGroup {
  id?: string;
  name: string;
  name_ar: string;
  /** 0 = skippable. 1+ = must be answered. */
  min_select: number;
  /** 0 = no ceiling. 1 = a single choice. */
  max_select: number;
  sort_order: number;
  options: Addon[];
}

/** The shapes a group can take, in the words an admin would use. */
const GROUP_RULES = [
  { key: "one-required", label: "Required · choose 1", min: 1, max: 1 },
  { key: "one-optional", label: "Optional · choose up to 1", min: 0, max: 1 },
  { key: "many-required", label: "Required · choose several", min: 1, max: 0 },
  { key: "many-optional", label: "Optional · any number", min: 0, max: 0 },
] as const;

function ruleKeyFor(group: AddonGroup): string {
  const found = GROUP_RULES.find((r) => r.min === group.min_select && r.max === group.max_select);
  // A hand-tuned ceiling ("choose up to 3") is none of the four presets.
  return found ? found.key : "custom";
}

interface PopularItem {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: string;
  /** A straight percentage off this dish. 0 = no offer. */
  discount_percent: number | string;
  rating: string;
  time_text: string;
  time_text_ar: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  category_id: string | null;
  tags: string[];
  show_in_top_picks: boolean;
  top_picks_order: number;
  show_in_deals: boolean;
  deals_order: number;
  addon_groups: AddonGroup[];
}

const DIETARY_TAGS = [
  { key: "veg",             label: "Veg",             emoji: "🥗" },
  { key: "non_veg",         label: "Non-Veg",         emoji: "🍗" },
  { key: "spicy",           label: "Spicy",           emoji: "🌶️" },
  { key: "contains_cheese", label: "Contains Cheese", emoji: "🧀" },
] as const;

const EMPTY: Omit<PopularItem, "id"> = {
  name: "",
  name_ar: "",
  description: "",
  description_ar: "",
  price: "",
  discount_percent: "",
  rating: "4.5",
  time_text: "15–20 min",
  time_text_ar: "",
  image_url: "",
  sort_order: 0,
  is_active: true,
  category_id: null,
  tags: [],
  show_in_top_picks: false,
  top_picks_order: 0,
  show_in_deals: false,
  deals_order: 0,
  addon_groups: [],
};

const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function KalbaPopularAdmin() {
  const [items, setItems] = useState<PopularItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; data: Omit<PopularItem, "id"> & { id?: string } }>({
    open: false, mode: "add", data: { ...EMPTY },
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /* Columns the last save could not write, because the migration adding them
     has not been run. Shown rather than swallowed. */
  const [saveWarning, setSaveWarning] = useState<string[]>([]);
  /* Migrations this database has not had run. Checked on load, because a photo
     that will not stick is a mystery until somebody says why. */
  const [missingMigrations, setMissingMigrations] = useState<
    { migration: string; needed: string }[]
  >([]);

  async function load() {
    setLoading(true);
    const [itemsRes, catsRes, schemaRes] = await Promise.all([
      fetch("/api/admin/kalba/popular"),
      fetch("/api/admin/kalba/categories"),
      fetch("/api/admin/kalba/schema-check"),
    ]);
    const [itemsData, catsData, schemaData] = await Promise.all([
      itemsRes.json(),
      catsRes.json(),
      schemaRes.json().catch(() => ({ missing: [] })),
    ]);
    setItems(Array.isArray(itemsData) ? itemsData : []);
    setCategories(Array.isArray(catsData) ? catsData : []);
    setMissingMigrations(schemaData?.missing ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setModal({ open: true, mode: "add", data: { ...EMPTY, addon_groups: [] } }); }
  function openEdit(item: PopularItem) {
    setModal({
      open: true,
      mode: "edit",
      data: {
        ...item,
        // Deep enough that editing a draft cannot mutate the loaded list.
        addon_groups: (item.addon_groups ?? []).map((g) => ({
          ...g,
          options: [...(g.options ?? [])],
        })),
      },
    });
  }
  function closeModal() { setModal((m) => ({ ...m, open: false })); }
  function handleField(key: string, value: unknown) {
    setModal((m) => ({ ...m, data: { ...m.data, [key]: value } }));
  }

  function setGroups(update: (list: AddonGroup[]) => AddonGroup[]) {
    setModal((m) => ({
      ...m,
      data: { ...m.data, addon_groups: update(m.data.addon_groups ?? []) },
    }));
  }

  function addGroup(preset?: { name: string; options: string[] }) {
    setGroups((list) => [
      ...list,
      {
        name: preset?.name ?? "",
        name_ar: "",
        // The commonest question by far: pick exactly one.
        min_select: 1,
        max_select: 1,
        sort_order: list.length,
        /* No blank row for a plain group: seeding one made the first "Add
           option" look like it had added two. A preset brings its own. */
        options: (preset?.options ?? []).map((name, i) => ({
          name,
          name_ar: "",
          image_url: "",
          price: "",
          sort_order: i,
        })),
      },
    ]);
  }

  /* Size is a choice group like any other — this only saves typing the three
     commonest options, and their prices are still the admin's to set. */
  function addSizeGroup() {
    addGroup({ name: "Choice of Size", options: ["Small", "Medium", "Large"] });
  }

  function updateGroup(gi: number, patch: Partial<AddonGroup>) {
    setGroups((list) => list.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  }

  function removeGroup(gi: number) {
    // Renumbered so the order the admin sees is the order the shopper sees.
    setGroups((list) =>
      list.filter((_, i) => i !== gi).map((g, i) => ({ ...g, sort_order: i })),
    );
  }

  function moveGroup(gi: number, by: -1 | 1) {
    setGroups((list) => {
      const to = gi + by;
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      [next[gi], next[to]] = [next[to], next[gi]];
      return next.map((g, i) => ({ ...g, sort_order: i }));
    });
  }

  function addOption(gi: number) {
    setGroups((list) =>
      list.map((g, i) =>
        i === gi
          ? {
              ...g,
              options: [
                ...g.options,
                { name: "", name_ar: "", image_url: "", price: "", sort_order: g.options.length },
              ],
            }
          : g,
      ),
    );
  }

  function updateOption(gi: number, oi: number, patch: Partial<Addon>) {
    setGroups((list) =>
      list.map((g, i) =>
        i === gi
          ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) }
          : g,
      ),
    );
  }

  function removeOption(gi: number, oi: number) {
    setGroups((list) =>
      list.map((g, i) =>
        i === gi
          ? {
              ...g,
              options: g.options
                .filter((_, j) => j !== oi)
                .map((o, j) => ({ ...o, sort_order: j })),
            }
          : g,
      ),
    );
  }

  function toggleTag(key: string) {
    setModal((m) => {
      const tags = m.data.tags ?? [];
      return { ...m, data: { ...m.data, tags: tags.includes(key) ? tags.filter((t) => t !== key) : [...tags, key] } };
    });
  }

  async function handleSave() {
    setSaving(true);
    const res =
      modal.mode === "add"
        ? await fetch("/api/admin/kalba/popular", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(modal.data),
          })
        : await fetch(`/api/admin/kalba/popular/${modal.data.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(modal.data),
          });

    const saved = await res.json().catch(() => null);
    setSaving(false);

    /* Something was saved, but not all of it — a photo or a whole group had
       nowhere to go. Keep the form open and say which migration is missing,
       rather than closing on what looks like a clean save. */
    const missing: string[] = saved?.droppedColumns ?? [];
    if (missing.length > 0) {
      setSaveWarning(missing);
      return;
    }

    setSaveWarning([]);
    closeModal();
    load();
  }

  /** What the last save could not store, if anything. */
  const MIGRATION_FOR: Record<string, string> = {
    image_url: "supabase/kalba_item_addons.sql",
    group_id: "supabase/kalba_addon_groups.sql",
    kalba_addon_groups: "supabase/kalba_addon_groups.sql",
  };

  async function handleDelete() {
    if (!deleteId) return;
    await fetch(`/api/admin/kalba/popular/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  /** "AED 22 → AED 19.80", or nothing when there is no offer to preview. */
  const offerPreview = (() => {
    const pct = Math.min(100, Math.max(0, Number(modal.data.discount_percent) || 0));
    const base = parseFloat(String(modal.data.price));
    if (pct <= 0 || !Number.isFinite(base) || base <= 0) return "";
    const net = Math.round(base * (100 - pct)) / 100;
    return `AED ${base} → AED ${net}`;
  })();

  function categoryLabel(item: PopularItem) {
    if (!item.category_id) return null;
    const cat = categories.find((c) => c.id === item.category_id);
    return cat ? `${cat.emoji} ${cat.label}` : null;
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">University Kalba Page</p>
          <h1 className="text-2xl font-semibold text-gray-900">Popular Around Campus</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""} · product cards grid</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#ea580c" }}>
          <Plus size={16} />
          Add item
        </button>
      </div>

      {missingMigrations.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <p className="text-sm font-semibold text-amber-900">
            Your database is behind — some settings on this screen cannot be saved yet.
          </p>
          <ul className="mt-2 space-y-1">
            {missingMigrations.map(({ migration, needed }) => (
              <li key={migration} className="text-[12px] text-amber-800">
                <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">{migration}</code>
                <span className="text-amber-700"> — needed for {needed}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-700 mt-2">
            Run each one in the Supabase SQL editor. They are safe to run more than once. Until
            then those fields save nowhere, which is why an uploaded photo does not stick.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Photo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Top Picks</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Deals</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-16 text-gray-400 text-sm">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-16 text-gray-400 text-sm">No items yet.</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>
                    }
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-800">{item.name}</p>
                  {categoryLabel(item) && (
                    <span className="text-[11px] text-orange-500 font-medium">{categoryLabel(item)}</span>
                  )}
                  {(item.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(item.tags ?? []).map((t) => {
                        const dt = DIETARY_TAGS.find((d) => d.key === t);
                        return dt ? (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100 font-medium">{dt.emoji} {dt.label}</span>
                        ) : null;
                      })}
                    </div>
                  )}
                  {(item.addon_groups ?? []).length > 0 && (
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-medium mt-1">
                      {item.addon_groups.length} choice
                      {item.addon_groups.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white" style={{ background: "#ea580c" }}>AED {item.price}</span>
                  {Number(item.discount_percent) > 0 && (
                    <span className="block text-[10px] font-bold text-green-600 mt-1">
                      −{Number(item.discount_percent)}% offer
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">★ {item.rating}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{item.time_text}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{item.sort_order}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {item.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <PicksToggle
                    endpoint={`/api/admin/kalba/popular/${item.id}`}
                    enabled={!!item.show_in_top_picks}
                    onChange={(v) => setItems((list) => list.map((x) => (x.id === item.id ? { ...x, show_in_top_picks: v } : x)))}
                  />
                </td>
                <td className="px-4 py-3">
                  <PicksToggle
                      variant="deals"
                    endpoint={`/api/admin/kalba/popular/${item.id}`}
                    enabled={!!item.show_in_deals}
                    onChange={(v) => setItems((list) => list.map((x) => (x.id === item.id ? { ...x, show_in_deals: v } : x)))}
                  />
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

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-semibold text-gray-900">{modal.mode === "add" ? "Add item" : "Edit item"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <BilingualField
                  label="Item Name"
                  value={modal.data.name}
                  valueAr={modal.data.name_ar ?? ""}
                  onChange={(v) => handleField("name", v)}
                  onChangeAr={(v) => handleField("name_ar", v)}
                  placeholder="Student Breakfast Box"
                />
              </div>

              <BilingualField
                label="Description"
                hint="(optional — shown on the card)"
                value={modal.data.description ?? ""}
                valueAr={modal.data.description_ar ?? ""}
                onChange={(v) => handleField("description", v)}
                onChangeAr={(v) => handleField("description_ar", v)}
                placeholder="Crispy chicken, lettuce and garlic sauce"
                multiline
                rows={2}
              />

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
                <select
                  value={modal.data.category_id ?? ""}
                  onChange={(e) => handleField("category_id", e.target.value || null)}
                  className={`${inputCls} bg-white`}
                >
                  <option value="">— No category —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Dietary Tags</label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_TAGS.map((tag) => {
                    const selected = (modal.data.tags ?? []).includes(tag.key);
                    return (
                      <button key={tag.key} type="button" onClick={() => toggleTag(tag.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${selected ? "border-orange-400 bg-orange-50 text-orange-700" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}>
                        <span>{tag.emoji}</span>{tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Offer <span className="font-normal text-gray-400">(% off this dish)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={modal.data.discount_percent ?? ""}
                    onChange={(e) => handleField("discount_percent", e.target.value)}
                    placeholder="0"
                    className={`${inputCls} w-24`}
                  />
                  <span className="text-sm text-gray-400">%</span>
                  {/* Shows the arithmetic rather than making them do it. */}
                  {offerPreview && (
                    <span className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-md px-2 py-1">
                      {offerPreview}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Comes off the dish price only, before any options are added. Leave blank or 0 for
                  no offer.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Price (AED)</label>
                  <input type="text" value={modal.data.price} onChange={(e) => handleField("price", e.target.value)} className={inputCls} placeholder="5" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rating</label>
                  <input type="text" value={modal.data.rating} onChange={(e) => handleField("rating", e.target.value)} className={inputCls} placeholder="4.6" />
                </div>
                <div>
                  <BilingualField
                    label="Time"
                    value={modal.data.time_text}
                    valueAr={modal.data.time_text_ar ?? ""}
                    onChange={(v) => handleField("time_text", v)}
                    onChangeAr={(v) => handleField("time_text_ar", v)}
                    placeholder="15–20 min"
                  />
                </div>
              </div>

              <ImageUploadField
                label="Item Photo"
                value={modal.data.image_url}
                onChange={(url) => handleField("image_url", url)}
                folder="kalba"
                hint="600×450px · landscape"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Sort Order</label>
                  <input type="number" value={modal.data.sort_order} onChange={(e) => handleField("sort_order", parseInt(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                  <select value={modal.data.is_active ? "active" : "inactive"} onChange={(e) => handleField("is_active", e.target.value === "active")}
                    className={`${inputCls} bg-white`}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <PicksField
                enabled={!!modal.data.show_in_top_picks}
                order={modal.data.top_picks_order ?? 0}
                onChange={(patch) => setModal((m) => ({ ...m, data: { ...m.data, ...patch } }))}
              />

              <PicksField
                variant="deals"
                enabled={!!modal.data.show_in_deals}
                order={modal.data.deals_order ?? 0}
                onChange={(patch) => setModal((m) => ({ ...m, data: { ...m.data, ...patch } }))}
              />

              {/* Choice groups ──────────────────────────────────────── */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700">Choices &amp; Add-ons</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={addSizeGroup}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-colors"
                    >
                      <Ruler size={12} />
                      Sizes
                    </button>
                    <button
                      type="button"
                      onClick={() => addGroup()}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-colors"
                    >
                      <Plus size={12} />
                      Add choice group
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
                  Each group is one question the shopper is asked before this dish goes in the
                  cart — &ldquo;Choice of Side item&rdquo;, &ldquo;Choice of Beverages&rdquo; — and
                  its options are the answers. Leave an option&apos;s price blank when it costs
                  nothing. A dish with no groups is added in a single tap, as before.
                </p>

                {(modal.data.addon_groups ?? []).length === 0 ? (
                  <p className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-3 text-center">
                    No choices — this dish is added straight to the cart.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(modal.data.addon_groups ?? []).map((group, gi) => (
                      <div
                        key={group.id ?? `new-group-${gi}`}
                        className="rounded-xl border border-gray-200 bg-gray-50/60 p-3"
                      >
                        {/* Group heading and its rule */}
                        <div className="flex items-start gap-2 mb-2.5">
                          <div className="flex flex-col gap-0.5 mt-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveGroup(gi, -1)}
                              disabled={gi === 0}
                              aria-label="Move group up"
                              className="w-5 h-4 flex items-center justify-center rounded text-gray-400 hover:text-orange-600 disabled:opacity-25"
                            >
                              <ChevronUp size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveGroup(gi, 1)}
                              disabled={gi === (modal.data.addon_groups ?? []).length - 1}
                              aria-label="Move group down"
                              className="w-5 h-4 flex items-center justify-center rounded text-gray-400 hover:text-orange-600 disabled:opacity-25"
                            >
                              <ChevronDown size={13} />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0 space-y-2">
                            <input
                              type="text"
                              value={group.name}
                              onChange={(e) => updateGroup(gi, { name: e.target.value })}
                              placeholder="Choice of Side item"
                              className={`${inputCls} font-semibold`}
                            />
                            <input
                              type="text"
                              dir="rtl"
                              value={group.name_ar ?? ""}
                              onChange={(e) => updateGroup(gi, { name_ar: e.target.value })}
                              placeholder="بالعربية (اختياري)"
                              className={inputCls}
                            />
                            <div className="flex items-center gap-2">
                              <select
                                value={ruleKeyFor(group)}
                                onChange={(e) => {
                                  const rule = GROUP_RULES.find((r) => r.key === e.target.value);
                                  if (rule) updateGroup(gi, { min_select: rule.min, max_select: rule.max });
                                }}
                                className={`${inputCls} bg-white flex-1`}
                              >
                                {GROUP_RULES.map((r) => (
                                  <option key={r.key} value={r.key}>{r.label}</option>
                                ))}
                                {ruleKeyFor(group) === "custom" && (
                                  <option value="custom">
                                    Custom · {group.min_select}–{group.max_select || "any"}
                                  </option>
                                )}
                              </select>
                              {/* A ceiling only means anything above one pick. */}
                              {group.max_select !== 1 && (
                                <input
                                  type="number"
                                  min="0"
                                  value={group.max_select}
                                  onChange={(e) =>
                                    updateGroup(gi, { max_select: parseInt(e.target.value) || 0 })
                                  }
                                  title="Most that may be picked. 0 = no limit."
                                  className={`${inputCls} w-20`}
                                />
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeGroup(gi)}
                            aria-label={`Remove ${group.name || "group"}`}
                            className="w-8 h-8 mt-1 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Its options */}
                        <div className="space-y-2 ps-2 border-s-2 border-orange-100">
                          {group.options.length === 0 && (
                            <p className="text-[11px] text-gray-400 py-1">
                              No options yet — add the answers to this question below.
                            </p>
                          )}
                          {group.options.map((option, oi) => (
                            <div
                              key={option.id ?? `new-option-${oi}`}
                              className="flex items-start gap-2 rounded-lg border border-gray-100 bg-white p-2.5"
                            >
                              <GripVertical size={13} className="text-gray-300 mt-3 shrink-0" />
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="grid grid-cols-[1fr_5rem] gap-2">
                                  <input
                                    type="text"
                                    value={option.name}
                                    onChange={(e) => updateOption(gi, oi, { name: e.target.value })}
                                    placeholder="Regular Fries"
                                    className={inputCls}
                                  />
                                  {/* Blank is a real answer, not a missing one. */}
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={option.price}
                                    onChange={(e) => updateOption(gi, oi, { price: e.target.value })}
                                    placeholder="AED —"
                                    title="Extra charge in AED. Leave blank if this option is included."
                                    className={inputCls}
                                  />
                                </div>
                                <input
                                  type="text"
                                  dir="rtl"
                                  value={option.name_ar ?? ""}
                                  onChange={(e) => updateOption(gi, oi, { name_ar: e.target.value })}
                                  placeholder="بالعربية (اختياري)"
                                  className={inputCls}
                                />
                                <ImageUploadField
                                  label="Photo (optional)"
                                  value={option.image_url ?? ""}
                                  onChange={(url) => updateOption(gi, oi, { image_url: url })}
                                  folder="kalba"
                                  hint="square, 200×200px"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeOption(gi, oi)}
                                aria-label={`Remove ${option.name || "option"}`}
                                className="w-8 h-8 mt-1 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => addOption(gi)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 text-[11px] font-semibold text-gray-500 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-colors w-full justify-center"
                          >
                            <Plus size={12} />
                            Add option
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-2xl">
              {saveWarning.length > 0 && (
                <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-3 leading-relaxed">
                  <p className="font-semibold mb-1">Saved, but not everything.</p>
                  <p>
                    Your database is missing{" "}
                    {saveWarning.map((c) => <code key={c} className="font-mono">{c}</code>)
                      .reduce<React.ReactNode[]>((acc, node, i) => (i === 0 ? [node] : [...acc, ", ", node]), [])}
                    . Run{" "}
                    {Array.from(new Set(saveWarning.map((c) => MIGRATION_FOR[c] ?? c))).map((file) => (
                      <code key={file} className="font-mono">{file}</code>
                    ))}{" "}
                    in the Supabase SQL editor, then save again — photos and choice groups have
                    nowhere to be stored until you do.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
                {saving ? "Saving..." : modal.mode === "add" ? "Add item" : "Save changes"}
              </button>
              </div>
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
