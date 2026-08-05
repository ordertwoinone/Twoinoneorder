"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Search, Star, Clock, ChevronUp, ChevronDown } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  cuisine: string[];
  logo_url: string;
  food_image_url: string;
  background_image_url: string;
  rating: number;
  delivery_time: string;
  url: string;
  badge: string | null;
  offer_text: string | null;
  badge_bg_color: string;
  badge_text_color: string;
  offer_bg_color: string;
  offer_text_color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const EMPTY: Omit<Restaurant, "id" | "created_at"> = {
  name: "", slug: "", cuisine: [], logo_url: "", food_image_url: "", background_image_url: "",
  rating: 4.5, delivery_time: "20-30 min", url: "", badge: null, offer_text: "", sort_order: 0,
  is_active: true, badge_bg_color: "", badge_text_color: "", offer_bg_color: "", offer_text_color: "",
};

/* Suggestions only — the badge is free text, so new ones can be typed in. */
const BADGE_SUGGESTIONS = ["Free Delivery", "Best Seller", "Popular", "New"];

/* Mirrors the card's fallbacks so the admin preview matches the homepage. */
const BADGE_PILL: Record<string, { bg: string; text: string }> = {
  "Best Seller": { bg: "#fff7ed", text: "#ea580c" },
  "Popular":     { bg: "#fef2f2", text: "#dc2626" },
  "New":         { bg: "#faf5ff", text: "#7c3aed" },
};
const BADGE_PILL_FALLBACK = { bg: "#f3f4f6", text: "#4b5563" };
const OFFER_FALLBACK = { bg: "#FEF3C7", text: "#8A6100" };

function pillColors(bg: string, text: string, fallback: { bg: string; text: string }) {
  return { background: bg?.trim() || fallback.bg, color: text?.trim() || fallback.text };
}

/* A background/text pair for one pill. Empty means "use the default", so the
   swatch shows the fallback and Reset clears back to it. */
function ColorPair({ label, bg, text, fallback, onBg, onText }: {
  label: string;
  bg: string;
  text: string;
  fallback: { bg: string; text: string };
  onBg: (v: string) => void;
  onText: (v: string) => void;
}) {
  const field = (
    value: string,
    fallbackValue: string,
    onChange: (v: string) => void,
    name: string,
  ) => (
    <div>
      <label className="block text-[11px] font-medium text-gray-500 mb-1">{name}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : fallbackValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer shrink-0 bg-white" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={fallbackValue}
          className="w-full min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400" />
        {value && (
          <button type="button" onClick={() => onChange("")}
            className="px-2.5 py-2 rounded-lg text-[11px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors shrink-0">
            Reset
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-600 mb-1.5">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        {field(bg, fallback.bg, onBg, "Background")}
        {field(text, fallback.text, onText, "Text")}
      </div>
    </div>
  );
}

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
  const [moving, setMoving] = useState<string | null>(null);
  const [cuisineInput, setCuisineInput] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/restaurants");
    setRestaurants(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // New restaurants land at the bottom of the homepage rather than jumping
  // ahead of the running order.
  function openAdd() {
    const last = Math.max(0, ...restaurants.map((r) => r.sort_order ?? 0));
    setModal({ open: true, mode: "add", data: { ...EMPTY, sort_order: last + 1 } });
    setCuisineInput("");
  }
  // Colour columns may be missing on rows saved before they existed — coalesce
  // so the inputs stay controlled.
  function openEdit(r: Restaurant) {
    setModal({
      open: true,
      mode: "edit",
      data: {
        ...r,
        badge_bg_color: r.badge_bg_color || "",
        badge_text_color: r.badge_text_color || "",
        offer_bg_color: r.offer_bg_color || "",
        offer_text_color: r.offer_text_color || "",
      },
    });
    setCuisineInput(r.cuisine?.join(", ") || "");
  }
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

  /**
   * Move a restaurant one place up or down the homepage. The list is
   * renumbered 1..n rather than swapping two values, so positions stay unique
   * even if rows arrive sharing one — only the rows that actually changed get
   * written.
   */
  async function move(id: string, dir: -1 | 1) {
    const from = restaurants.findIndex((r) => r.id === id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= restaurants.length) return;

    const reordered = [...restaurants];
    const [row] = reordered.splice(from, 1);
    reordered.splice(to, 0, row);
    const renumbered = reordered.map((r, i) => ({ ...r, sort_order: i + 1 }));

    const changed = renumbered.filter(
      (r) => restaurants.find((o) => o.id === r.id)?.sort_order !== r.sort_order
    );

    // Show the new order straight away — waiting on the round trip reads as a
    // dead button.
    setRestaurants(renumbered);
    setMoving(id);

    await Promise.all(
      changed.map((r) =>
        fetch(`/api/admin/restaurants/${r.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: r.sort_order }),
        })
      )
    );
    setMoving(null);
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
    <div className="p-4 sm:p-8">
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
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Restaurant</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cuisine</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Badge</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Offer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-16 text-gray-400 text-sm">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-16 text-gray-400 text-sm">{search ? "No results found." : "No restaurants yet."}</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                {/* Position on the homepage. Reordering is disabled while a
                    search is on, since the neighbours you'd swap with are
                    hidden. */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 text-xs font-semibold text-gray-400 tabular-nums">{r.sort_order}</span>
                    <div className="flex flex-col">
                      <button
                        onClick={() => move(r.id, -1)}
                        disabled={!!search || !!moving || restaurants[0]?.id === r.id}
                        title={search ? "Clear the search to reorder" : "Move up"}
                        aria-label="Move up"
                        className="w-6 h-5 flex items-center justify-center rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => move(r.id, 1)}
                        disabled={!!search || !!moving || restaurants[restaurants.length - 1]?.id === r.id}
                        title={search ? "Clear the search to reorder" : "Move down"}
                        aria-label="Move down"
                        className="w-6 h-5 flex items-center justify-center rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                </td>
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
                    ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={pillColors(r.badge_bg_color, r.badge_text_color, BADGE_PILL[r.badge] || BADGE_PILL_FALLBACK)}>
                        {r.badge}
                      </span>
                    : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-4 py-3">
                  {r.offer_text
                    ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={pillColors(r.offer_bg_color, r.offer_text_color, OFFER_FALLBACK)}>
                        {r.offer_text}
                      </span>
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
              <ImageUploadField label="Background Image" value={modal.data.background_image_url} onChange={(url) => handleField("background_image_url", url)} folder="restaurants" hint="Optional · sits behind the logo on the card" />
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
                  <input type="text" list="badge-suggestions" value={modal.data.badge || ""}
                    onChange={(e) => handleField("badge", e.target.value || null)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Best Seller" />
                  <datalist id="badge-suggestions">
                    {BADGE_SUGGESTIONS.map((b) => <option key={b} value={b} />)}
                  </datalist>
                  <p className="text-[11px] text-gray-400 mt-1">Type anything — new badges are allowed.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Offer</label>
                  <input type="text" value={modal.data.offer_text || ""} onChange={(e) => handleField("offer_text", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="30% OFF ALL ITEMS" />
                  <p className="text-[11px] text-gray-400 mt-1">Blank hides the pill.</p>
                </div>
              </div>

              {/* Pill colours — blank means the built-in palette. */}
              <div className="rounded-lg border border-gray-200 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">Card pill colours</p>
                  <div className="flex flex-wrap items-center gap-1.5 justify-end">
                    {modal.data.badge && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                        style={pillColors(modal.data.badge_bg_color, modal.data.badge_text_color, BADGE_PILL[modal.data.badge] || BADGE_PILL_FALLBACK)}>
                        {modal.data.badge}
                      </span>
                    )}
                    {modal.data.offer_text && (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md leading-relaxed"
                        style={pillColors(modal.data.offer_bg_color, modal.data.offer_text_color, OFFER_FALLBACK)}>
                        {modal.data.offer_text}
                      </span>
                    )}
                  </div>
                </div>

                <ColorPair
                  label="Badge"
                  bg={modal.data.badge_bg_color} text={modal.data.badge_text_color}
                  fallback={BADGE_PILL[modal.data.badge || ""] || BADGE_PILL_FALLBACK}
                  onBg={(v) => handleField("badge_bg_color", v)}
                  onText={(v) => handleField("badge_text_color", v)}
                />
                <ColorPair
                  label="Offer"
                  bg={modal.data.offer_bg_color} text={modal.data.offer_text_color}
                  fallback={OFFER_FALLBACK}
                  onBg={(v) => handleField("offer_bg_color", v)}
                  onText={(v) => handleField("offer_text_color", v)}
                />
                <p className="text-[11px] text-gray-400">
                  Leave a colour blank to use the default. A{" "}
                  <span className="font-semibold text-gray-600">Free Delivery</span> badge shows as a
                  green “Free” on the card&rsquo;s delivery line instead of a pill, so its colours are ignored.
                </p>
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
