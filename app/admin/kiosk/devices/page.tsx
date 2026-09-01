"use client";
import { useEffect, useState } from "react";
import { Copy, ExternalLink, MonitorSmartphone, Pencil, Plus, Trash2, X } from "lucide-react";
import { toDeviceSlug } from "@/lib/kiosk/types";

/**
 * admin → Kiosk → Screens.
 *
 * One row per physical panel. A screen knows which it is from the URL its
 * browser is pinned to — that address is the whole of its identity, so the job
 * of this page is to hand you that address to paste into the panel once, and
 * then to let you name and retire screens without touching the hardware.
 *
 * There is no password anywhere here on purpose. See supabase/kiosk_devices.sql
 * for why an unattended screen must not have a session that can expire.
 */

interface Device {
  id: string;
  slug: string;
  label: string;
  label_ar: string;
  location: string;
  is_active: boolean;
  sort_order: number;
}

const EMPTY: Omit<Device, "id"> = {
  slug: "",
  label: "",
  label_ar: "",
  location: "",
  is_active: true,
  sort_order: 0,
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function KioskDevicesAdmin() {
  const [items, setItems] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    data: Omit<Device, "id"> & { id?: string };
  }>({ open: false, mode: "add", data: { ...EMPTY } });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/kiosk/devices");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    const next = items.reduce((max, d) => Math.max(max, d.sort_order), 0) + 1;
    setError("");
    setModal({ open: true, mode: "add", data: { ...EMPTY, sort_order: next } });
  }

  function field(key: string, value: unknown) {
    setModal((m) => ({ ...m, data: { ...m.data, [key]: value } }));
  }

  async function save() {
    setSaving(true);
    setError("");
    const url =
      modal.mode === "add"
        ? "/api/admin/kiosk/devices"
        : `/api/admin/kiosk/devices/${modal.data.id}`;

    const res = await fetch(url, {
      method: modal.mode === "add" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modal.data),
    });
    const body = await res.json().catch(() => null);
    setSaving(false);

    /* Said out loud. Two screens cannot share an address, and a save that
       silently did nothing is how you end up with orders from the wrong panel. */
    if (!res.ok) {
      setError(body?.error || "That did not save.");
      return;
    }
    setModal((m) => ({ ...m, open: false }));
    load();
  }

  async function remove() {
    if (!deleteId) return;
    await fetch(`/api/admin/kiosk/devices/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  function copyUrl(slug: string) {
    const url = `${window.location.origin}/kiosk/${slug}`;
    navigator.clipboard?.writeText(url).then(
      () => { setCopied(slug); setTimeout(() => setCopied(null), 2000); },
      () => { /* an https-only API; the address is on screen to type either way */ },
    );
  }

  // What the address will be, shown while it is still being typed.
  const previewSlug = toDeviceSlug(modal.data.slug || modal.data.label);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Self-Order Kiosk</p>
          <h1 className="text-2xl font-semibold text-gray-900">Screens</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} screen{items.length === 1 ? "" : "s"} · every order records which one took it
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shrink-0"
          style={{ background: "#ea580c" }}
        >
          <Plus size={16} />
          Add screen
        </button>
      </div>

      <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
        <p className="text-sm font-semibold text-blue-900">Setting a panel up</p>
        <ol className="mt-1.5 list-decimal space-y-1 ps-5 text-sm text-blue-900">
          <li>Add the screen here and copy its address.</li>
          <li>Open that address in Chrome on the panel itself.</li>
          <li>
            Chrome menu (⋮) → <strong>Add to Home screen</strong> → Install. The tile installs as
            its own app, named after this screen, and opens full screen with no browser bar.
          </li>
          <li>Launch it from the home-screen icon from then on, not from a browser tab.</li>
        </ol>
        <p className="mt-2 text-[12px] text-blue-800">
          Each screen installs pointing at its own address, so the tile always reopens the panel it
          belongs to and the orders keep carrying its name. There is nothing to log in to, so a
          kiosk can never end up showing a password prompt to customers.
        </p>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-400">Loading...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <MonitorSmartphone size={26} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-gray-700">No screens registered</p>
          <p className="mt-1 text-sm text-gray-500">
            The plain <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">/kiosk</code> address
            still works and takes orders — they just will not say which panel they came from.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((device) => (
            <div key={device.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold text-gray-900 leading-tight">
                    {device.label || device.slug}
                  </p>
                  {device.location && (
                    <p className="mt-0.5 text-xs text-gray-500">{device.location}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${device.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                >
                  {device.is_active ? "In service" : "Off"}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                <code className="flex-1 min-w-0 truncate text-xs text-gray-700">
                  /kiosk/{device.slug}
                </code>
                <button
                  onClick={() => copyUrl(device.slug)}
                  className="shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-white transition-colors"
                >
                  <Copy size={12} />
                  {copied === device.slug ? "Copied" : "Copy"}
                </button>
                <a
                  href={`/kiosk/${device.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-white transition-colors"
                >
                  <ExternalLink size={12} />
                  Open
                </a>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-[11px] text-gray-400">#{device.sort_order}</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setError(""); setModal({ open: true, mode: "edit", data: { ...device } }); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteId(device.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Add / edit ─── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                {modal.mode === "add" ? "Add screen" : "Edit screen"}
              </h2>
              <button
                onClick={() => setModal((m) => ({ ...m, open: false }))}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Name <span className="text-gray-400 font-normal">— what staff call it</span>
                </label>
                <input
                  type="text"
                  value={modal.data.label}
                  onChange={(e) => field("label", e.target.value)}
                  className={inputCls}
                  placeholder="Counter 1"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Address <span className="text-gray-400 font-normal">— point the panel here</span>
                </label>
                <input
                  type="text"
                  value={modal.data.slug}
                  onChange={(e) => field("slug", e.target.value)}
                  className={inputCls}
                  placeholder="leave blank to use the name"
                />
                <p className="mt-1.5 text-[11px] text-gray-500">
                  {previewSlug ? (
                    <>This screen will be at <code className="bg-gray-100 px-1 py-0.5 rounded">/kiosk/{previewSlug}</code></>
                  ) : (
                    "Type a name above and the address fills itself in."
                  )}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Where it stands <span className="text-gray-400 font-normal">— optional</span>
                </label>
                <input
                  type="text"
                  value={modal.data.location}
                  onChange={(e) => field("location", e.target.value)}
                  className={inputCls}
                  placeholder="Left of the till, by the window"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Order</label>
                  <input
                    type="number"
                    value={modal.data.sort_order}
                    onChange={(e) => field("sort_order", Number(e.target.value) || 0)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                  <select
                    value={modal.data.is_active ? "active" : "off"}
                    onChange={(e) => field("is_active", e.target.value === "active")}
                    className={`${inputCls} bg-white`}
                  >
                    <option value="active">In service</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </div>
              <p className="-mt-2 text-[11px] text-gray-500">
                Off shows the closed notice on this panel only — the other screens keep taking
                orders.
              </p>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">
                  {error}
                </p>
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
                disabled={saving || !previewSlug}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#ea580c" }}
              >
                {saving ? "Saving..." : modal.mode === "add" ? "Add screen" : "Save changes"}
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
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Remove this screen?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Orders it already took keep its name and stay in Order History. The panel itself will
              show the unnamed kiosk if it is still pointed at that address.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
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
