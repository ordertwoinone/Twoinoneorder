"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

interface Photo {
  id: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

export default function BuffetPhotosAdmin() {
  const [items, setItems] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/buffet/photos", { cache: "no-store" });
    setItems(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addPhoto() {
    if (!newUrl) return;
    setSaving(true);
    await fetch("/api/admin/buffet/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: newUrl, sort_order: items.length + 1, is_active: true }),
    });
    setSaving(false);
    setNewUrl("");
    setAdding(false);
    load();
  }

  async function toggle(p: Photo) {
    await fetch(`/api/admin/buffet/photos/${p.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    setItems((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !p.is_active } : x));
  }

  async function remove(id: string) {
    if (!confirm("Delete this photo?")) return;
    await fetch(`/api/admin/buffet/photos/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Buffet Page</p>
          <h1 className="text-2xl font-semibold text-gray-900">Photos Tab</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} photo{items.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setAdding((v) => !v)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#ea580c" }}>
          <Plus size={16} /> Add photo
        </button>
      </div>

      {adding && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 space-y-4">
          <ImageUploadField label="Photo" value={newUrl} onChange={setNewUrl} folder="buffet-photos" hint="Square images look best" />
          <div className="flex gap-3">
            <button onClick={() => { setAdding(false); setNewUrl(""); }} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
            <button onClick={addPhoto} disabled={saving || !newUrl} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
              {saving ? "Adding…" : "Add photo"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">No photos yet.</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map((p) => (
            <div key={p.id} className={`relative group rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-100 ${p.is_active ? "" : "opacity-50"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-1.5 right-1.5 flex gap-1">
                <button onClick={() => toggle(p)} className="w-7 h-7 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center shadow-sm" title={p.is_active ? "Hide" : "Show"}>
                  {p.is_active ? <ToggleRight size={15} className="text-green-500" /> : <ToggleLeft size={15} className="text-gray-400" />}
                </button>
                <button onClick={() => remove(p.id)} className="w-7 h-7 rounded-lg bg-white/90 hover:bg-red-50 flex items-center justify-center shadow-sm" title="Delete">
                  <Trash2 size={13} className="text-gray-500 hover:text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
