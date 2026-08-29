"use client";
import { useEffect, useState } from "react";
import { Film, ImageIcon, Pencil, Plus, Trash2, X } from "lucide-react";
import BilingualField from "@/components/admin/BilingualField";
import ImageUploadField from "@/components/admin/ImageUploadField";
import MediaUploadField, { looksLikeVideo } from "@/components/admin/MediaUploadField";
import { AD_FALLBACK_SECONDS } from "@/lib/kiosk/types";

/**
 * admin → Kiosk → Ads.
 *
 * What the screen plays while nobody is standing at it. One row per slide; the
 * kiosk cycles the active ones in this order and shows "Ad 2 of 3" against the
 * count.
 */

interface Ad {
  id: string;
  media_type: "video" | "image";
  media_url: string;
  poster_url: string;
  headline: string;
  headline_ar: string;
  subline: string;
  subline_ar: string;
  duration_seconds: number;
  sort_order: number;
  is_active: boolean;
}

const EMPTY: Omit<Ad, "id"> = {
  media_type: "video",
  media_url: "",
  poster_url: "",
  headline: "",
  headline_ar: "",
  subline: "",
  subline_ar: "",
  duration_seconds: 0,
  sort_order: 0,
  is_active: true,
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function KioskAdsAdmin() {
  const [items, setItems] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    data: Omit<Ad, "id"> & { id?: string };
  }>({ open: false, mode: "add", data: { ...EMPTY } });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/kiosk/ads");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    // A new slide lands after the ones already there rather than on top of them.
    const next = items.reduce((max, a) => Math.max(max, a.sort_order), 0) + 1;
    setModal({ open: true, mode: "add", data: { ...EMPTY, sort_order: next } });
  }

  function field(key: string, value: unknown) {
    setModal((m) => ({ ...m, data: { ...m.data, [key]: value } }));
  }

  async function save() {
    setSaving(true);
    const body = {
      ...modal.data,
      // The picker takes either kind, so what was actually uploaded decides.
      media_type: looksLikeVideo(modal.data.media_url) ? "video" : "image",
    };
    if (modal.mode === "add") {
      await fetch("/api/admin/kiosk/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch(`/api/admin/kiosk/ads/${modal.data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setSaving(false);
    setModal((m) => ({ ...m, open: false }));
    load();
  }

  async function remove() {
    if (!deleteId) return;
    await fetch(`/api/admin/kiosk/ads/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  const active = items.filter((a) => a.is_active).length;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Self-Order Kiosk</p>
          <h1 className="text-2xl font-semibold text-gray-900">Ads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} slide{items.length === 1 ? "" : "s"} · {active} playing on the idle screen
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shrink-0"
          style={{ background: "#ea580c" }}
        >
          <Plus size={16} />
          Add slide
        </button>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-400">Loading...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Film size={26} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-gray-700">No slides yet</p>
          <p className="mt-1 text-sm text-gray-500">
            The idle screen shows a plain dark panel until you add one.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((ad) => (
            <div key={ad.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="relative aspect-video bg-gray-900">
                {ad.media_url ? (
                  ad.media_type === "video" ? (
                    <video
                      src={ad.media_url}
                      poster={ad.poster_url || undefined}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={ad.media_url} alt="" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <ImageIcon size={22} />
                  </div>
                )}
                <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                  {ad.media_type === "video" ? <Film size={10} /> : <ImageIcon size={10} />}
                  {ad.media_type}
                </span>
                <span
                  className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${ad.is_active ? "bg-green-500 text-white" : "bg-gray-700 text-gray-200"}`}
                >
                  {ad.is_active ? "Active" : "Off"}
                </span>
              </div>

              <div className="p-4">
                <p className="text-sm font-bold text-gray-900 line-clamp-1">
                  {ad.headline || <span className="text-gray-400">No headline</span>}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{ad.subline || "—"}</p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[11px] text-gray-400">
                    #{ad.sort_order} ·{" "}
                    {ad.duration_seconds > 0
                      ? `${ad.duration_seconds}s`
                      : ad.media_type === "video"
                        ? "full length"
                        : `${AD_FALLBACK_SECONDS}s`}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setModal({ open: true, mode: "edit", data: { ...ad } })}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(ad.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Add / edit ─── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-semibold text-gray-900">
                {modal.mode === "add" ? "Add slide" : "Edit slide"}
              </h2>
              <button
                onClick={() => setModal((m) => ({ ...m, open: false }))}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <MediaUploadField
                label="Video or image"
                hint="1080×1920 portrait · MP4 (H.264) or JPG"
                value={modal.data.media_url}
                onChange={(url) => field("media_url", url)}
                folder="kiosk"
              />

              {looksLikeVideo(modal.data.media_url) && (
                <ImageUploadField
                  label="Poster frame"
                  hint="shown while the video loads — keeps the screen from flashing black"
                  value={modal.data.poster_url}
                  onChange={(url) => field("poster_url", url)}
                  folder="kiosk"
                />
              )}

              <BilingualField
                label="Headline"
                value={modal.data.headline}
                valueAr={modal.data.headline_ar}
                onChange={(v) => field("headline", v)}
                onChangeAr={(v) => field("headline_ar", v)}
                placeholder="CRISPY. FRESH. MADE FOR STUDENTS."
              />

              <BilingualField
                label="Line underneath"
                value={modal.data.subline}
                valueAr={modal.data.subline_ar}
                onChange={(v) => field("subline", v)}
                onChangeAr={(v) => field("subline_ar", v)}
                placeholder="Campus Combo • AED 19"
              />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Hold for (sec)</label>
                  <input
                    type="number"
                    min={0}
                    value={modal.data.duration_seconds}
                    onChange={(e) => field("duration_seconds", Math.max(0, Number(e.target.value) || 0))}
                    className={inputCls}
                  />
                </div>
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
                    <option value="active">Active</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </div>
              <p className="-mt-2 text-[11px] text-gray-500">
                0 seconds lets a video run its own length; an image holds for {AD_FALLBACK_SECONDS}.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-2xl">
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
                {saving ? "Saving..." : modal.mode === "add" ? "Add slide" : "Save changes"}
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
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Delete this slide?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              The file stays in the media library. This only removes it from the kiosk.
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
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
