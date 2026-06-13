"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  applicable_item_ids: string[];
  is_active: boolean;
  expires_at: string | null;
}

interface SelectableItem {
  id: string;
  name: string;
  price: string;
  group: "Popular" | "Special";
}

const BLANK: Omit<Coupon, "id"> = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  min_order_amount: 0,
  applicable_item_ids: [],
  is_active: true,
  expires_at: null,
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function KalbaCouponsAdmin() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [allItems, setAllItems] = useState<SelectableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Coupon, "id">>(BLANK);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/kalba/coupons").then((r) => r.json()),
      fetch("/api/admin/kalba/popular").then((r) => r.json()),
      fetch("/api/admin/kalba/specials").then((r) => r.json()),
    ]).then(([couponsData, popularData, specialsData]) => {
      setCoupons(Array.isArray(couponsData) ? couponsData : []);
      const items: SelectableItem[] = [
        ...(Array.isArray(popularData) ? popularData : []).map((i: { id: string; name: string; price: string }) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          group: "Popular" as const,
        })),
        ...(Array.isArray(specialsData) ? specialsData : []).map((i: { id: string; name: string; price_text: string }) => ({
          id: i.id,
          name: i.name,
          price: i.price_text,
          group: "Special" as const,
        })),
      ];
      setAllItems(items);
    }).finally(() => setLoading(false));
  }, []);

  function field(key: keyof typeof form, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleItem(id: string) {
    setForm((f) => {
      const ids = f.applicable_item_ids;
      return {
        ...f,
        applicable_item_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
      };
    });
  }

  async function handleCreate() {
    if (!form.code.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/kalba/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, code: form.code.toUpperCase().trim() }),
    });
    const data = await res.json();
    if (!data.error) {
      setCoupons((prev) => [data, ...prev]);
      setForm(BLANK);
      setShowForm(false);
    }
    setSaving(false);
  }

  async function toggleActive(c: Coupon) {
    const res = await fetch(`/api/admin/kalba/coupons/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    const data = await res.json();
    if (!data.error) {
      setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active: !c.is_active } : x)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this coupon?")) return;
    await fetch(`/api/admin/kalba/coupons/${id}`, { method: "DELETE" });
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  }

  function discountLabel(c: Coupon) {
    return c.discount_type === "percentage" ? `${c.discount_value}% off` : `AED ${c.discount_value} off`;
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">University Kalba</p>
          <h1 className="text-2xl font-semibold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create discount codes customers can apply in the cart</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#ea580c" }}
        >
          <Plus size={15} />
          New Coupon
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700">Create New Coupon</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => field("code", e.target.value.toUpperCase())}
                className={inputCls}
                placeholder="e.g. STUDENT20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => field("description", e.target.value)}
                className={inputCls}
                placeholder="e.g. 20% student discount"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Discount Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => field("discount_type", "percentage")}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${form.discount_type === "percentage" ? "border-orange-400 bg-orange-50 text-orange-600" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
                >
                  % Percent
                </button>
                <button
                  type="button"
                  onClick={() => field("discount_type", "fixed")}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${form.discount_type === "fixed" ? "border-orange-400 bg-orange-50 text-orange-600" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
                >
                  AED Fixed
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {form.discount_type === "percentage" ? "Discount %" : "Discount AED"}
              </label>
              <input
                type="number"
                min="0"
                max={form.discount_type === "percentage" ? 100 : undefined}
                value={form.discount_value}
                onChange={(e) => field("discount_value", parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Min Order (AED)</label>
              <input
                type="number"
                min="0"
                value={form.min_order_amount}
                onChange={(e) => field("min_order_amount", parseFloat(e.target.value) || 0)}
                className={inputCls}
                placeholder="0 = no minimum"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Expires At (optional)</label>
              <input
                type="date"
                value={form.expires_at ? form.expires_at.slice(0, 10) : ""}
                onChange={(e) => field("expires_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Applicable items */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Applicable Items
              <span className="ml-2 text-gray-400 font-normal">
                {form.applicable_item_ids.length === 0 ? "(applies to all items)" : `(${form.applicable_item_ids.length} selected)`}
              </span>
            </label>
            {allItems.length === 0 ? (
              <p className="text-xs text-gray-400">No items found. Add Popular Items or Specials first.</p>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {(["Popular", "Special"] as const).map((group) => {
                  const groupItems = allItems.filter((i) => i.group === group);
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={group}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2 bg-gray-50 border-b border-gray-100">
                        {group} Items
                      </p>
                      {groupItems.map((item) => {
                        const checked = form.applicable_item_ids.includes(item.id);
                        return (
                          <label key={item.id}
                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-orange-50 border-b border-gray-50 last:border-0 transition-colors">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleItem(item.id)}
                              className="w-4 h-4 rounded accent-orange-500"
                            />
                            <span className="flex-1 text-sm text-gray-800">{item.name}</span>
                            {item.price && (
                              <span className="text-[11px] font-semibold text-gray-400">
                                {item.group === "Special" ? item.price : `AED ${item.price}`}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setShowForm(false); setForm(BLANK); }}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.code.trim()}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
              style={{ background: "#ea580c" }}
            >
              {saving ? "Creating..." : "Create Coupon"}
            </button>
          </div>
        </div>
      )}

      {/* Coupons list */}
      <div className="space-y-3">
        {coupons.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-400">No coupons yet. Click New Coupon to create one.</p>
          </div>
        ) : (
          coupons.map((c) => {
            const expanded = expandedId === c.id;
            const applicableNames = c.applicable_item_ids.length === 0
              ? "All items"
              : c.applicable_item_ids
                  .map((id) => allItems.find((i) => i.id === id)?.name ?? id)
                  .join(", ");

            return (
              <div key={c.id} className={`bg-white rounded-xl border transition-all ${c.is_active ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Code badge */}
                  <span className="font-mono text-sm font-extrabold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 shrink-0">
                    {c.code}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{discountLabel(c)}</span>
                      {c.description && (
                        <span className="text-[11px] text-gray-400 truncate">{c.description}</span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-gray-400 mt-0.5">
                      {applicableNames}
                      {c.min_order_amount > 0 && ` · min AED ${c.min_order_amount}`}
                      {c.expires_at && ` · expires ${new Date(c.expires_at).toLocaleDateString()}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedId(expanded ? null : c.id)}
                      className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors"
                      title="Details"
                    >
                      {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                    </button>
                    <button
                      onClick={() => toggleActive(c)}
                      className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors"
                      title={c.is_active ? "Deactivate" : "Activate"}
                    >
                      {c.is_active
                        ? <ToggleRight size={18} className="text-green-500" />
                        : <ToggleLeft size={18} className="text-gray-400" />}
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-50">
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">Applicable Items</p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.applicable_item_ids.length === 0 ? (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">All items</span>
                      ) : (
                        c.applicable_item_ids.map((id) => {
                          const item = allItems.find((i) => i.id === id);
                          return (
                            <span key={id} className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-lg border border-orange-100">
                              {item?.name ?? id}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
