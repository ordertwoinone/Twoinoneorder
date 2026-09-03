"use client";
import { useEffect, useState } from "react";
import { ExternalLink, KeyRound, Lock, Pencil, Plus, ShieldCheck, Trash2, UsersRound, X } from "lucide-react";
import { PIN_MAX, PIN_MIN, ROLE_LABEL, type PosRole } from "@/lib/pos/constants";
import {
  PERMISSION_GROUPS,
  PERMISSION_HINT,
  PERMISSION_LABEL,
  ROLE_DEFAULTS,
  type PosPermission,
} from "@/lib/pos/permissions";

/**
 * admin → POS → Staff.
 *
 * Till accounts, which are not admin accounts: a name and a PIN for a shared
 * tablet, with no way through to this panel. See supabase/pos.sql for why the
 * two are separate tables rather than one with a role column.
 *
 * A PIN can be set and reset here but never read — it is stored hashed, so an
 * account whose PIN is forgotten gets a new one rather than the old one back.
 *
 * Access is per person, not per role. A role sets the starting point — what a
 * cashier normally gets — and an account can then be granted or refused any of
 * it by name. That distinction is the whole point: a branch with eight people
 * on the rota has cashiers who are trusted with the drawer count and cashiers
 * hired last week, and the only way to separate them with a role alone was to
 * make one of them a manager, which also handed over the day close and the
 * void button.
 *
 * An account left on "the role's usual access" stores null rather than a copy
 * of the defaults, so it keeps following the role if the defaults ever change.
 */

interface Staff {
  id: string;
  staff_id: string;
  name: string;
  role: PosRole;
  is_active: boolean;
  /** null = follows the role. An array = exactly this, whatever the role says. */
  permissions: PosPermission[] | null;
  failed_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
}

const EMPTY = {
  staff_id: "",
  name: "",
  role: "cashier" as PosRole,
  is_active: true,
  pin: "",
  permissions: null as PosPermission[] | null,
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

function when(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function PosStaffAdmin() {
  const [items, setItems] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [modal, setModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    data: typeof EMPTY & { id?: string };
  }>({ open: false, mode: "add", data: { ...EMPTY } });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/pos/staff");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    setError("");
    const url = modal.mode === "add" ? "/api/admin/pos/staff" : `/api/admin/pos/staff/${modal.data.id}`;
    const res = await fetch(url, {
      method: modal.mode === "add" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modal.data),
    });
    const body = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(body?.error || "That did not save.");
      return;
    }
    setModal((m) => ({ ...m, open: false }));
    load();
  }

  async function unlock(id: string) {
    await fetch(`/api/admin/pos/staff/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...items.find((s) => s.id === id), unlock: true }),
    });
    load();
  }

  async function remove() {
    if (!deleteId) return;
    const res = await fetch(`/api/admin/pos/staff/${deleteId}`, { method: "DELETE" });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setDeleteError(body?.error || "Could not remove them.");
      return;
    }
    setDeleteId(null);
    setDeleteError("");
    load();
  }

  const lockedNow = (s: Staff) => Boolean(s.locked_until && new Date(s.locked_until) > new Date());

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Point of Sale</p>
          <h1 className="text-2xl font-semibold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} till account{items.length === 1 ? "" : "s"} · they sign in with an ID and a PIN
          </p>
          <a
            href="/pos/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-orange-600 hover:underline"
          >
            Open the till login <ExternalLink size={12} />
          </a>
        </div>
        <button
          onClick={() => { setError(""); setModal({ open: true, mode: "add", data: { ...EMPTY } }); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shrink-0"
          style={{ background: "#ea580c" }}
        >
          <Plus size={16} />
          Add staff
        </button>
      </div>

      <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
        <p className="text-sm text-amber-900">
          <strong>These are not admin logins.</strong> A till account can take orders and work a
          shift; it cannot open this panel. PINs are stored hashed and cannot be read back — if
          someone forgets theirs, set a new one here.
        </p>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-400">Loading...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <UsersRound size={26} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-gray-700">No till accounts yet</p>
          <p className="mt-1 text-sm text-gray-500">Add one and staff can sign in at /pos/login.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {["Staff ID", "Name", "Role", "Access", "Last sign-in", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{s.staff_id}</code>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{s.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.role === "manager" ? "bg-purple-100 text-purple-700" : s.role === "kitchen" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {ROLE_LABEL[s.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.permissions === null ? (
                      <span className="text-[11.5px] text-gray-500">Role defaults</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        <ShieldCheck size={11} />
                        {s.permissions.length} granted
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{when(s.last_login_at)}</td>
                  <td className="px-4 py-3">
                    {lockedNow(s) ? (
                      <button
                        onClick={() => unlock(s.id)}
                        className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                        title="Too many wrong PINs. Click to unlock."
                      >
                        <Lock size={11} />
                        Locked · unlock
                      </button>
                    ) : (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                      >
                        {s.is_active ? "Active" : "Off"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => {
                          setError("");
                          setModal({
                            open: true,
                            mode: "edit",
                            data: {
                              id: s.id,
                              staff_id: s.staff_id,
                              name: s.name,
                              role: s.role,
                              is_active: s.is_active,
                              pin: "",
                              permissions: s.permissions ?? null,
                            },
                          });
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => { setDeleteError(""); setDeleteId(s.id); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
      )}

      {/* ─── Add / edit ─── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                {modal.mode === "add" ? "Add till account" : "Edit till account"}
              </h2>
              <button onClick={() => setModal((m) => ({ ...m, open: false }))} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Staff ID <span className="text-gray-400 font-normal">— what they type to sign in</span>
                </label>
                <input
                  type="text"
                  value={modal.data.staff_id}
                  onChange={(e) => setModal((m) => ({ ...m, data: { ...m.data, staff_id: e.target.value } }))}
                  className={inputCls}
                  placeholder="1001"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Name</label>
                <input
                  type="text"
                  value={modal.data.name}
                  onChange={(e) => setModal((m) => ({ ...m, data: { ...m.data, name: e.target.value } }))}
                  className={inputCls}
                  placeholder="John Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Role</label>
                  <select
                    value={modal.data.role}
                    onChange={(e) => setModal((m) => ({ ...m, data: { ...m.data, role: e.target.value as PosRole } }))}
                    className={`${inputCls} bg-white`}
                  >
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                    <option value="kitchen">Kitchen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                  <select
                    value={modal.data.is_active ? "active" : "off"}
                    onChange={(e) => setModal((m) => ({ ...m, data: { ...m.data, is_active: e.target.value === "active" } }))}
                    className={`${inputCls} bg-white`}
                  >
                    <option value="active">Active</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </div>
              <p className="-mt-2 text-[11px] text-gray-500">
                The role sets what they start with. A manager can void an order, approve a large
                expense and close the business day; a kitchen account sees the kitchen board and
                the availability switch, and nothing that touches money. Switching someone off
                signs them out of every tablet immediately.
              </p>

              {/* ─── What this person may actually reach ─── */}
              <div className="rounded-xl border border-gray-200">
                <label className="flex items-start gap-2.5 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modal.data.permissions === null}
                    onChange={(e) =>
                      setModal((m) => ({
                        ...m,
                        data: {
                          ...m.data,
                          /* Unticking starts from the role's own list rather
                             than from nothing, so granting one extra screen is
                             a single tick instead of rebuilding the job. */
                          permissions: e.target.checked ? null : [...ROLE_DEFAULTS[m.data.role]],
                        },
                      }))
                    }
                    className="mt-0.5 h-4 w-4 accent-orange-600"
                  />
                  <span>
                    <span className="block text-xs font-semibold text-gray-800">
                      Use the role&apos;s usual access
                    </span>
                    <span className="block text-[11px] text-gray-500">
                      Untick to grant or withhold screens for this person alone.
                    </span>
                  </span>
                </label>

                {modal.data.permissions !== null && (
                  <div className="border-t border-gray-200 px-4 py-3 space-y-4">
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.title}>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          {group.title}
                        </p>
                        <p className="mb-2 text-[11px] text-gray-400">{group.hint}</p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {group.keys.map((key) => {
                            const on = modal.data.permissions!.includes(key);
                            return (
                              <label
                                key={key}
                                title={PERMISSION_HINT[key]}
                                className="flex items-start gap-2 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={() =>
                                    setModal((m) => {
                                      const current = m.data.permissions ?? [];
                                      return {
                                        ...m,
                                        data: {
                                          ...m.data,
                                          permissions: on
                                            ? current.filter((p) => p !== key)
                                            : [...current, key],
                                        },
                                      };
                                    })
                                  }
                                  className="mt-0.5 h-4 w-4 accent-orange-600"
                                />
                                <span className="text-[12px] leading-tight text-gray-700">
                                  {PERMISSION_LABEL[key]}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {modal.data.permissions.length === 0 && (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11.5px] font-medium text-amber-800">
                        Nothing is ticked. They will be able to sign in and reach no screen at
                        all — which is a way to suspend somebody without switching them off, if
                        that is what you meant.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <KeyRound size={13} />
                    PIN
                  </span>
                  <span className="text-gray-400 font-normal ms-1">
                    {modal.mode === "add" ? `— ${PIN_MIN} to ${PIN_MAX} digits` : "— leave blank to keep the current one"}
                  </span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={modal.data.pin}
                  onChange={(e) =>
                    setModal((m) => ({ ...m, data: { ...m.data, pin: e.target.value.replace(/\D/g, "").slice(0, PIN_MAX) } }))
                  }
                  className={`${inputCls} tracking-[0.3em] font-bold`}
                  placeholder={modal.mode === "add" ? "••••" : "unchanged"}
                />
                <p className="mt-1.5 text-[11px] text-gray-500">
                  Write it down for them now — it is hashed on save and cannot be shown again.
                </p>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">{error}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setModal((m) => ({ ...m, open: false }))}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#ea580c" }}
              >
                {saving ? "Saving..." : modal.mode === "add" ? "Add account" : "Save changes"}
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
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Remove this account?</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              They will be signed out everywhere. Anyone who has worked a shift cannot be removed —
              switch them off instead, so their name keeps meaning something on past orders.
            </p>
            {deleteError && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteId(null); setDeleteError(""); }}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={remove}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
