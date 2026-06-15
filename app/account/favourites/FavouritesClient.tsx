"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Heart, Loader2, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useFavorites } from "@/lib/favorites/FavoritesContext";

interface Row {
  id: string;
  item_key: string;
  name: string;
  image_url: string;
  href: string;
  subtitle: string;
}

export default function FavouritesClient() {
  const supabase = createClient();
  const { isFavorite, toggle, loggedIn, ready } = useFavorites();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!loggedIn) { setLoading(false); return; }
    supabase
      .from("favorites")
      .select("id, item_key, name, image_url, href, subtitle")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as Row[]) || []);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, loggedIn]);

  const visible = rows.filter((r) => isFavorite(r.item_key));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/account" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 mb-4 transition-colors">
        <ChevronLeft size={16} /> Back to Account
      </Link>

      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Favourites</h1>
      <p className="text-sm text-gray-500 mb-6">Your saved restaurants & dishes.</p>

      {!ready || loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-orange-500" size={24} /></div>
      ) : !loggedIn ? (
        <EmptyLogin />
      ) : visible.length === 0 ? (
        <Empty />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {visible.map((r) => (
            <div key={r.id} className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
              <a href={r.href || "#"} className="block">
                <div className="relative h-28 sm:h-32 bg-gray-50">
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                  )}
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
                  {r.subtitle && <p className="text-[11px] text-gray-400 truncate">{r.subtitle}</p>}
                </div>
              </a>
              <button
                onClick={() => toggle({ itemKey: r.item_key, name: r.name, imageUrl: r.image_url, href: r.href, subtitle: r.subtitle })}
                aria-label="Remove from favourites"
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm border border-gray-100 flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Heart size={15} className="fill-red-500 stroke-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-50 flex items-center justify-center">
        <Heart size={26} className="text-orange-400" />
      </div>
      <h2 className="text-lg font-extrabold text-gray-900 mb-1">No favourites yet</h2>
      <p className="text-sm text-gray-500 mb-5">Tap the heart on any restaurant or dish to save it here.</p>
      <Link href="/" className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors">
        Browse restaurants
      </Link>
    </div>
  );
}

function EmptyLogin() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-50 flex items-center justify-center">
        <LogIn size={26} className="text-orange-400" />
      </div>
      <h2 className="text-lg font-extrabold text-gray-900 mb-1">Sign in to view favourites</h2>
      <p className="text-sm text-gray-500 mb-5">Log in to save and sync your favourite restaurants & dishes.</p>
      <Link href="/account" className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors">
        Sign in
      </Link>
    </div>
  );
}
