"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, MapPin, Plus, Trash2, Loader2, LogIn, X, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Address {
  id: string;
  label: string;
  address: string;
  area: string;
  city: string;
  phone: string;
  is_default: boolean;
}

const EMPTY = { label: "Home", address: "", area: "", city: "", phone: "", is_default: false };

export default function AddressesClient() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [rows, setRows] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  async function loadRows() {
    const { data } = await supabase
      .from("saved_addresses")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setRows((data as Address[]) || []);
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user ?? null);
      if (data.user) await loadRows();
      setChecking(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    // If marking default, clear other defaults first
    if (form.is_default) {
      await supabase.from("saved_addresses").update({ is_default: false }).eq("user_id", user.id);
    }
    await supabase.from("saved_addresses").insert({ ...form, user_id: user.id });
    await loadRows();
    setForm({ ...EMPTY });
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("saved_addresses").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  async function makeDefault(id: string) {
    if (!user) return;
    await supabase.from("saved_addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("saved_addresses").update({ is_default: true }).eq("id", id);
    await loadRows();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/account" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 mb-4 transition-colors">
        <ChevronLeft size={16} /> Back to Account
      </Link>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-extrabold text-gray-900">Saved Addresses</h1>
        {user && (
          <button
            onClick={() => { setForm({ ...EMPTY }); setShowForm(true); }}
            className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[13px] font-bold px-3.5 py-2 rounded-full transition-colors"
          >
            <Plus size={15} /> Add
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">Manage your delivery locations.</p>

      {checking ? (
        <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-orange-500" size={24} /></div>
      ) : !user ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-50 flex items-center justify-center">
            <LogIn size={26} className="text-orange-400" />
          </div>
          <h2 className="text-lg font-extrabold text-gray-900 mb-1">Sign in to manage addresses</h2>
          <p className="text-sm text-gray-500 mb-5">Log in to save your delivery locations.</p>
          <Link href="/account" className="inline-flex bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors">Sign in</Link>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-50 flex items-center justify-center">
            <MapPin size={26} className="text-orange-400" />
          </div>
          <h2 className="text-lg font-extrabold text-gray-900 mb-1">No saved addresses</h2>
          <p className="text-sm text-gray-500">Add an address to speed up your bookings & orders.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <MapPin size={18} className="text-orange-500" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900">{a.label}</p>
                  {a.is_default && <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Default</span>}
                </div>
                <p className="text-[13px] text-gray-600 mt-0.5">{a.address}</p>
                <p className="text-[12px] text-gray-400">{[a.area, a.city].filter(Boolean).join(", ")}</p>
                {a.phone && <p className="text-[12px] text-gray-400 mt-0.5">{a.phone}</p>}
                <div className="flex items-center gap-3 mt-2">
                  {!a.is_default && (
                    <button onClick={() => makeDefault(a.id)} className="text-[12px] font-semibold text-orange-600 hover:underline inline-flex items-center gap-1">
                      <Star size={12} /> Set default
                    </button>
                  )}
                  <button onClick={() => handleDelete(a.id)} className="text-[12px] font-semibold text-red-500 hover:underline inline-flex items-center gap-1">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowForm(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSave}
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-3"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-extrabold text-gray-900">Add address</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>

            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label (Home, Office…)" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required placeholder="Building / street address *" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Area" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="accent-orange-600" />
              Set as default address
            </label>

            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-70">
              {saving && <Loader2 size={15} className="animate-spin" />} Save address
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
