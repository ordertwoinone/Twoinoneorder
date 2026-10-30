"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import BilingualField from "@/components/admin/BilingualField";

interface KitchenTable {
  id: string;
  code: string;
  section: string;
  section_ar: string;
  seats: string;
  sort_order: number;
  is_active: boolean;
}

/** Sort order holds what is typed, so a half-entered value is not rewritten. */
type FormData = Omit<KitchenTable, "id" | "sort_order"> & { id?: string; sort_order: string };

const EMPTY: FormData = { code: "", section: "", section_ar: "", seats: "4", sort_order: "0", is_active: true };

const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
const labelCls = "block text-xs font-semibold text-gray-700 mb-1.5";

export default function KitchenTablesAdmin() {
  const [items, setItems] = useState<KitchenTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; data: FormData }>({
    open: false, mode: "add", data: { ...EMPTY },
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    const res = await fetch("/api/admin/kitchens/tables").catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && Array.isArray(data)) setItems(data);
    else setLoadError(data?.error ?? "Could not load the tables.");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setFormError("");
    // Continues the list: same area as the last table, next in the order.
    const last = items[items.length - 1];
    setModal({
      open: true,
      mode: "add",
      data: { ...EMPTY, section: last?.section ?? "", section_ar: last?.section_ar ?? "", sort_order: String((last?.sort_order ?? -1) + 1) },
    });
  }
  function openEdit(item: KitchenTable) {
    setFormError("");
    setModal({ open: true, mode: "edit", data: { ...item, section_ar: item.section_ar ?? "", sort_order: String(item.sort_order) } });
  }
  function closeModal() { setModal((m) => ({ ...m, open: false })); }
  function handleField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setModal((m) => ({ ...m, data: { ...m.data, [key]: value } }));
  }

  async function handleSave() {
    setSaving(true);
    setFormError("");
    const res = await fetch(
      modal.mode === "add" ? "/api/admin/kitchens/tables" : `/api/admin/kitchens/tables/${modal.data.id}`,
      {
        method: modal.mode === "add" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modal.data),
      },
    ).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setFormError(data?.error ?? "Could not save this table.");
      return;
    }
    closeModal();
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteError("");
    const res = await fetch(`/api/admin/kitchens/tables/${deleteId}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setDeleteError(data?.error ?? "Could not delete this table.");
      return;
    }
    setDeleteId(null);
    load();
  }

  const sections = Array.from(new Set(items.map((i) => i.section).filter(Boolean)));

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Kitchens Page</p>
          <h1 className="text-2xl font-semibold text-gray-900">Tables</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} table{items.length !== 1 ? "s" : ""} · shown in the popup on the kitchens page</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#ea580c" }}>
          <Plus size={16} />
          Add table
        </button>
      </div>

      {loadError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
          <span className="block text-xs mt-1 text-red-600">If the table is missing, run supabase/kitchen_tables.sql in the Supabase SQL editor.</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Table</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Area</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Seats</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm">No tables yet. The popup will only ask how many people.</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-gray-800">{item.code}</td>
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{item.section || "—"}</td>
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{item.seats}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{item.sort_order}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {item.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(item)} aria-label={`Edit ${item.code}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => { setDeleteError(""); setDeleteId(item.id); }} aria-label={`Delete ${item.code}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-base font-semibold text-gray-900">{modal.mode === "add" ? "Add table" : "Edit table"}</h2>
              <button onClick={closeModal} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="kt-code" className={labelCls}>Table name</label>
                  <input id="kt-code" type="text" value={modal.data.code} onChange={(e) => handleField("code", e.target.value)} placeholder="T1" className={inputCls} />
                </div>
                <div>
                  <label htmlFor="kt-seats" className={labelCls}>Seats</label>
                  <input id="kt-seats" type="text" value={modal.data.seats} onChange={(e) => handleField("seats", e.target.value)} placeholder="4 or 8–10" className={inputCls} />
                </div>
              </div>

              <BilingualField
                label="Area"
                value={modal.data.section}
                valueAr={modal.data.section_ar}
                onChange={(v) => handleField("section", v)}
                onChangeAr={(v) => handleField("section_ar", v)}
                placeholder="Main Dining Hall"
                listId="kt-sections"
              />
              <datalist id="kt-sections">
                {sections.map((s) => <option key={s} value={s} />)}
              </datalist>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="kt-order" className={labelCls}>Sort Order</label>
                  <input id="kt-order" type="number" step="1" value={modal.data.sort_order} onChange={(e) => handleField("sort_order", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="kt-status" className={labelCls}>Status</label>
                  <select id="kt-status" value={modal.data.is_active ? "active" : "inactive"} onChange={(e) => handleField("is_active", e.target.value === "active")} className={`${inputCls} bg-white`}>
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
                {saving ? "Saving..." : modal.mode === "add" ? "Add table" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Delete table?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Past orders keep their table name. This cannot be undone.</p>
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
