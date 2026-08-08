"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, ShieldCheck, KeyRound } from "lucide-react";
import { ADMIN_AREAS } from "@/lib/admin-areas";

interface Member {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  areas: string[];
  is_owner: boolean;
  is_active: boolean;
  created_at: string;
  last_sign_in_at?: string;
}

type Draft = {
  id?: string;
  email: string;
  name: string;
  password: string;
  areas: string[];
  is_active: boolean;
};

const EMPTY: Draft = { email: "", name: "", password: "", areas: [], is_active: true };

const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

function lastSeen(iso?: string) {
  if (!iso) return "Never signed in";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}

export default function TeamAdmin() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; data: Draft }>({
    open: false, mode: "add", data: { ...EMPTY },
  });
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/team", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "Could not load the team.");
      setMembers([]);
    } else {
      setError("");
      setMembers(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setModal({ open: true, mode: "add", data: { ...EMPTY } }); }
  function openEdit(m: Member) {
    setModal({
      open: true,
      mode: "edit",
      data: { id: m.id, email: m.email, name: m.name, password: "", areas: m.areas ?? [], is_active: m.is_active },
    });
  }
  function set(key: keyof Draft, value: unknown) {
    setModal((prev) => ({ ...prev, data: { ...prev.data, [key]: value } }));
  }
  function toggleArea(key: string) {
    setModal((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        areas: prev.data.areas.includes(key)
          ? prev.data.areas.filter((a) => a !== key)
          : [...prev.data.areas, key],
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const { id, ...payload } = modal.data;
    const res = await fetch(
      modal.mode === "add" ? "/api/admin/team" : `/api/admin/team/${id}`,
      {
        method: modal.mode === "add" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const body = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      setError(body?.error ?? "Could not save this member.");
      return;
    }
    setModal((m) => ({ ...m, open: false }));
    load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/team/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not remove this member.");
    }
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Access</p>
          <h1 className="text-2xl font-semibold text-gray-900">Admin Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {members.length} member{members.length !== 1 ? "s" : ""} · each one sees only the areas ticked for them
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#ea580c" }}>
          <Plus size={16} /> Add member
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Member</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Can open</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last seen</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-16 text-gray-400 text-sm">Loading…</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-16 text-gray-400 text-sm">No members yet.</td></tr>
            ) : members.map((m) => (
              <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                    {m.name || "—"}
                    {m.is_owner && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        <ShieldCheck size={10} /> Owner
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">{m.email}</p>
                </td>
                <td className="px-4 py-3 max-w-[380px]">
                  {m.is_owner ? (
                    <span className="text-xs text-gray-500">Everything, including this screen</span>
                  ) : m.areas.length === 0 ? (
                    <span className="text-xs text-gray-400">Nothing yet</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {m.areas.map((key) => (
                        <span key={key} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {ADMIN_AREAS.find((a) => a.key === key)?.label ?? key}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{lastSeen(m.last_sign_in_at)}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {m.is_active ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => openEdit(m)}
                      disabled={m.is_owner}
                      title={m.is_owner ? "The owner's access cannot be changed" : "Edit"}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(m)}
                      disabled={m.is_owner}
                      title={m.is_owner ? "The owner cannot be removed" : "Remove access"}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                    >
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-semibold text-gray-900">
                {modal.mode === "add" ? "Add member" : `Edit ${modal.data.email}`}
              </h2>
              <button onClick={() => setModal((m) => ({ ...m, open: false }))} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Name</label>
                  <input type="text" value={modal.data.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Aisha" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={modal.data.email}
                    onChange={(e) => set("email", e.target.value)}
                    disabled={modal.mode === "edit"}
                    className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-500`}
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  <KeyRound size={11} className="inline me-1" />
                  {modal.mode === "add" ? "Password" : "New password"}
                </label>
                <input type="text" value={modal.data.password} onChange={(e) => set("password", e.target.value)} className={inputCls} placeholder="At least 8 characters" />
                <p className="text-[11px] text-gray-400 mt-1">
                  {modal.mode === "add"
                    ? "Leave empty if this email already signs in with Google — they keep their existing sign-in."
                    : "Leave empty to keep their current password."}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Areas they can open</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {ADMIN_AREAS.map((area) => {
                    const on = modal.data.areas.includes(area.key);
                    return (
                      <button
                        key={area.key}
                        type="button"
                        onClick={() => toggleArea(area.key)}
                        className={`text-left px-3 py-2.5 rounded-lg border transition ${
                          on ? "border-orange-300 bg-orange-50" : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            on ? "bg-orange-500 border-orange-500 text-white" : "border-gray-300"
                          }`}>
                            {on && <span className="text-[10px] leading-none">✓</span>}
                          </span>
                          <span className="text-[13px] font-semibold text-gray-800">{area.label}</span>
                        </span>
                        <span className="block text-[11px] text-gray-400 mt-0.5 ps-6">{area.hint}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => set("areas", ADMIN_AREAS.map((a) => a.key))} className="text-[11px] font-semibold text-orange-600 hover:underline">Select all</button>
                  <button type="button" onClick={() => set("areas", [])} className="text-[11px] font-semibold text-gray-500 hover:underline">Clear all</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                <select
                  value={modal.data.is_active ? "active" : "suspended"}
                  onChange={(e) => set("is_active", e.target.value === "active")}
                  className={`${inputCls} bg-white`}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended — cannot sign in to the panel</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setModal((m) => ({ ...m, open: false }))} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !modal.data.email.trim()}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#ea580c" }}
              >
                {saving ? "Saving…" : modal.mode === "add" ? "Add member" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Remove admin access?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {deleteTarget.email} loses the admin panel. Their sign-in itself stays, along with any bookings or favourites on it.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
