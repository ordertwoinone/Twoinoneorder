"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Save, Star } from "lucide-react";
import BilingualField from "@/components/admin/BilingualField";

interface Review {
  id: string;
  name: string;
  name_ar: string;
  rating: number;
  text: string;
  text_ar: string;
  date_text: string;
  date_text_ar: string;
  sort_order: number;
  is_active: boolean;
}

interface Summary {
  id?: string;
  rating: string;
  rating_count: string;
  rating_count_ar: string;
  tab_count: string;
  tab_count_ar: string;
  bar5: number; bar4: number; bar3: number; bar2: number; bar1: number;
}

const EMPTY_REVIEW: Omit<Review, "id"> = {
  name: "",
  name_ar: "", rating: 5, text: "", text_ar: "", date_text: "", date_text_ar: "",
  sort_order: 0, is_active: true,
};

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

export default function BuffetReviewsAdmin() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSummary, setSavingSummary] = useState(false);
  const [savedSummary, setSavedSummary] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; data: Omit<Review, "id"> & { id?: string } }>({
    open: false, mode: "add", data: { ...EMPTY_REVIEW },
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [s, r] = await Promise.all([
      fetch("/api/admin/buffet/review-summary", { cache: "no-store" }).then((x) => x.json()),
      fetch("/api/admin/buffet/reviews", { cache: "no-store" }).then((x) => x.json()),
    ]);
    setSummary(s);
    setReviews(Array.isArray(r) ? r : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function setS<K extends keyof Summary>(key: K, value: Summary[K]) {
    setSummary((f) => (f ? { ...f, [key]: value } : f));
  }

  async function saveSummary() {
    if (!summary) return;
    setSavingSummary(true);
    await fetch("/api/admin/buffet/review-summary", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(summary),
    });
    setSavingSummary(false);
    setSavedSummary(true);
    setTimeout(() => setSavedSummary(false), 3000);
  }

  function openAdd() { setModal({ open: true, mode: "add", data: { ...EMPTY_REVIEW, sort_order: reviews.length + 1 } }); }
  function openEdit(r: Review) { setModal({ open: true, mode: "edit", data: { ...r } }); }
  function field(key: string, value: unknown) { setModal((m) => ({ ...m, data: { ...m.data, [key]: value } })); }

  async function saveReview() {
    setSaving(true);
    if (modal.mode === "add") {
      await fetch("/api/admin/buffet/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(modal.data) });
    } else {
      await fetch(`/api/admin/buffet/reviews/${modal.data.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(modal.data) });
    }
    setSaving(false);
    setModal((m) => ({ ...m, open: false }));
    load();
  }

  async function removeReview() {
    if (!deleteId) return;
    await fetch(`/api/admin/buffet/reviews/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  if (loading || !summary) return <div className="p-8 text-sm text-gray-400">Loading…</div>;

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="mb-6">
        <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Buffet Page</p>
        <h1 className="text-2xl font-semibold text-gray-900">Reviews Tab</h1>
        <p className="text-sm text-gray-500 mt-0.5">The rating summary and customer reviews</p>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Rating Summary</h2>
          <button onClick={saveSummary} disabled={savingSummary} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-70" style={{ background: savedSummary ? "#16a34a" : "#ea580c" }}>
            <Save size={14} /> {savingSummary ? "Saving…" : savedSummary ? "Saved!" : "Save"}
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rating</label>
              <input value={summary.rating} onChange={(e) => setS("rating", e.target.value)} className={inputCls} placeholder="4.6" />
            </div>
            <div>
              <BilingualField
                label="Ratings count"
                value={summary.rating_count}
                valueAr={summary.rating_count_ar ?? ""}
                onChange={(v) => setS("rating_count", v)}
                onChangeAr={(v) => setS("rating_count_ar", v)}
                placeholder="2,100+"
              />
            </div>
            <div>
              <BilingualField
                label="Tab label count"
                value={summary.tab_count}
                valueAr={summary.tab_count_ar ?? ""}
                onChange={(v) => setS("tab_count", v)}
                onChangeAr={(v) => setS("tab_count_ar", v)}
                placeholder="2.1K+"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Star distribution (% per bar)</label>
            <div className="grid grid-cols-5 gap-2">
              {([5, 4, 3, 2, 1] as const).map((n) => (
                <div key={n}>
                  <span className="block text-[11px] text-gray-400 text-center mb-1">{n}★</span>
                  <input type="number" min="0" max="100"
                    value={summary[`bar${n}` as keyof Summary] as number}
                    onChange={(e) => setS(`bar${n}` as keyof Summary, Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) as never)}
                    className={`${inputCls} text-center`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews list */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Reviews ({reviews.length})</h2>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "#ea580c" }}>
          <Plus size={15} /> Add review
        </button>
      </div>

      <div className="space-y-2">
        {reviews.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">No reviews yet.</div>
        ) : reviews.map((r) => (
          <div key={r.id} className={`bg-white rounded-xl border border-gray-200 flex items-start gap-3 px-4 py-3 ${r.is_active ? "" : "opacity-60"}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">{r.name}</span>
                <span className="flex items-center gap-0.5 text-[11px] text-yellow-500 font-semibold">
                  <Star size={11} className="fill-yellow-400 text-yellow-400" /> {r.rating}
                </span>
                <span className="text-[11px] text-gray-400">· {r.date_text}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.text}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => openEdit(r)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-orange-50 flex items-center justify-center"><Pencil size={14} className="text-gray-400 hover:text-orange-600" /></button>
              <button onClick={() => setDeleteId(r.id)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center"><Trash2 size={14} className="text-gray-400 hover:text-red-500" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-semibold text-gray-900">{modal.mode === "add" ? "Add review" : "Edit review"}</h2>
              <button onClick={() => setModal((m) => ({ ...m, open: false }))} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <BilingualField
                    label="Name *"
                    value={modal.data.name}
                    valueAr={modal.data.name_ar ?? ""}
                    onChange={(v) => field("name", v)}
                    onChangeAr={(v) => field("name_ar", v)}
                    placeholder="Ahmed Al-Rashidi"
                  />
                </div>
                <div>
                  <BilingualField
                    label="Date text"
                    value={modal.data.date_text}
                    valueAr={modal.data.date_text_ar ?? ""}
                    onChange={(v) => field("date_text", v)}
                    onChangeAr={(v) => field("date_text_ar", v)}
                    placeholder="2 days ago"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rating</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => field("rating", n)} className="p-1">
                      <Star size={22} className={n <= modal.data.rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <BilingualField
                  label="Review text"
                  value={modal.data.text}
                  valueAr={modal.data.text_ar ?? ""}
                  onChange={(v) => field("text", v)}
                  onChangeAr={(v) => field("text_ar", v)}
                  placeholder="What the customer said…"
                  multiline
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Sort order</label>
                  <input type="number" value={modal.data.sort_order} onChange={(e) => field("sort_order", parseInt(e.target.value) || 0)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                  <select value={modal.data.is_active ? "active" : "inactive"} onChange={(e) => field("is_active", e.target.value === "active")} className={`${inputCls} bg-white`}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setModal((m) => ({ ...m, open: false }))} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button onClick={saveReview} disabled={saving || !modal.data.name} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
                {saving ? "Saving…" : modal.mode === "add" ? "Add review" : "Save changes"}
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
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Delete review?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button onClick={removeReview} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
