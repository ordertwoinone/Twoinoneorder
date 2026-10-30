"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";

interface Waiter {
  id: string;
  name: string;
  is_active: boolean;
}

interface FormData {
  id?: string;
  name: string;
  pin: string;
  is_active: boolean;
}

const EMPTY: FormData = { name: "", pin: "", is_active: true };

const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
const labelCls = "block text-xs font-semibold text-gray-700 mb-1.5";

export default function KitchenWaitersAdmin() {
  const [items, setItems] = useState<Waiter[]>([]);
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
    const res = await fetch("/api/admin/kitchens/waiters");
    const data = await res.json().catch(() => null);
    if (res.ok && Array.isArray(data)) setItems(data);
    else setLoadError(data?.error ?? "Could not load the waiters.");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setFormError("");
    setModal({ open: true, mode: "add", data: { ...EMPTY } });
  }
  function openEdit(item: Waiter) {
    setFormError("");
    setModal({ open: true, mode: "edit", data: { id: item.id, name: item.name, pin: "", is_active: item.is_active } });
  }
  function closeModal() { setModal((m) => ({ ...m, open: false })); }
  function handleField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setModal((m) => ({ ...m, data: { ...m.data, [key]: value } }));
  }

  async function handleSave() {
    const { pin } = modal.data;
    if (modal.mode === "add" ? pin.length !== 4 : pin.length > 0 && pin.length !== 4) {
      setFormError("The PIN must be exactly 4 digits.");
      return;
    }
    setSaving(true);
    setFormError("");
    const res = await fetch(
      modal.mode === "add" ? "/api/admin/kitchens/waiters" : `/api/admin/kitchens/waiters/${modal.data.id}`,
      {
        method: modal.mode === "add" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modal.data),
      },
    );
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setFormError(data?.error ?? "Could not save this waiter.");
      return;
    }
    closeModal();
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteError("");
    const res = await fetch(`/api/admin/kitchens/waiters/${deleteId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setDeleteError(data?.error ?? "Could not delete this waiter.");
      return;
    }
    setDeleteId(null);
    load();
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Kitchens Page</p>
          <h1 className="text-2xl font-semibold text-gray-900">Waiters</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} waiter{items.length !== 1 ? "s" : ""} · each types their own PIN in the table popup</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#ea580c" }}>
          <Plus size={16} />
          Add waiter
        </button>
      </div>

      {loadError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
          <span className="block text-xs mt-1 text-red-600">If the table is missing, run supabase/kitchen_waiters.sql in the Supabase SQL editor.</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">PIN</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-16 text-gray-400 text-sm">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-16 text-gray-400 text-sm">No waiters yet.</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-gray-800">{item.name}</td>
                <td className="px-4 py-3 text-xs text-gray-500 tracking-widest" aria-label="PIN hidden">••••</td>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">{modal.mode === "add" ? "Add waiter" : "Edit waiter"}</h2>
              <button onClick={closeModal} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label htmlFor="kw-name" className={labelCls}>Name</label>
                <input id="kw-name" type="text" value={modal.data.name} onChange={(e) => handleField("name", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label htmlFor="kw-pin" className={labelCls}>{modal.mode === "add" ? "4-digit PIN" : "New 4-digit PIN"}</label>
                <input
                  id="kw-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={4}
                  value={modal.data.pin}
                  onChange={(e) => handleField("pin", e.target.value.replace(/\D/g, ""))}
                  className={`${inputCls} tracking-widest`}
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  {modal.mode === "add"
                    ? "Each waiter needs a different PIN. It can't be viewed after saving, so tell the waiter now."
                    : "Leave blank to keep the current PIN. PINs can't be viewed, only replaced."}
                </p>
              </div>
              <div>
                <label htmlFor="kw-status" className={labelCls}>Status</label>
                <select id="kw-status" value={modal.data.is_active ? "active" : "inactive"} onChange={(e) => handleField("is_active", e.target.value === "active")} className={`${inputCls} bg-white`}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={closeModal} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
                {saving ? "Saving..." : modal.mode === "add" ? "Add waiter" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Delete waiter?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Their PIN stops working straight away. This cannot be undone.</p>
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
