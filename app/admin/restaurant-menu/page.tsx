"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";

interface RestaurantSummary {
  id: string;
  name: string;
  logo_url: string;
  url: string;
  is_active: boolean;
  item_count: number;
  available_count: number;
  category_count: number;
  last_synced_at: string | null;
}

interface MenuItem {
  id: string;
  external_id: string;
  name: string;
  price: number | null;
  currency: string;
  image_url: string | null;
  category: string | null;
  product_url: string | null;
  is_available: boolean;
  last_synced_at: string;
}

function formatSynced(iso: string | null): string {
  if (!iso) return "Never synced";
  const d = new Date(iso);
  return `Synced ${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function RestaurantMenuAdmin() {
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const loadSummary = useCallback(async (selectFirst: boolean) => {
    const res = await fetch("/api/admin/restaurant-menu");
    const data = await res.json();
    const list: RestaurantSummary[] = Array.isArray(data) ? data : [];
    setRestaurants(list);
    if (selectFirst && list.length > 0) setActiveId((current) => current ?? list[0].id);
    setLoading(false);
  }, []);

  const loadItems = useCallback(async (restaurantId: string) => {
    setItemsLoading(true);
    const res = await fetch(`/api/admin/restaurant-menu?restaurantId=${restaurantId}`);
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setItemsLoading(false);
  }, []);

  useEffect(() => { loadSummary(true); }, [loadSummary]);

  useEffect(() => {
    if (!activeId) return;
    setQuery("");
    setCategory("all");
    loadItems(activeId);
  }, [activeId, loadItems]);

  async function sync(restaurantId: string) {
    setSyncingId(restaurantId);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/restaurant-menu/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ kind: "error", text: data.error || "Sync failed" });
      } else {
        const extra = data.markedUnavailable ? `, ${data.markedUnavailable} no longer listed` : "";
        setNotice({
          kind: "ok",
          text: `${data.restaurant}: imported ${data.imported} items from ${data.categories} categories${extra}.`,
        });
        await loadSummary(false);
        if (restaurantId === activeId) await loadItems(restaurantId);
      }
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Sync failed" });
    } finally {
      setSyncingId(null);
    }
  }

  /** Sync every restaurant one at a time — a combined call would time out. */
  async function syncAll() {
    for (const r of restaurants) {
      if (!r.url) continue;
      await sync(r.id);
    }
  }

  const active = restaurants.find((r) => r.id === activeId) ?? null;

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (category !== "all" && i.category !== category) return false;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, category]);

  /** Group the filtered rows so the table reads category by category. */
  const grouped = useMemo<[string, MenuItem[]][]>(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of filtered) {
      const key = item.category || "Uncategorised";
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const busy = syncingId !== null;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Restaurants</p>
          <h1 className="text-2xl font-semibold text-gray-900">Restaurant Menus</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Every item imported from the four ordering storefronts, restaurant by restaurant.
          </p>
        </div>
        <button
          onClick={syncAll}
          disabled={busy || restaurants.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "#ea580c" }}
        >
          <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
          {busy ? "Syncing…" : "Sync all menus"}
        </button>
      </div>

      {notice && (
        <div
          className={`flex items-start gap-2 mb-5 px-4 py-3 rounded-xl text-sm ${
            notice.kind === "ok"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {notice.kind === "ok" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Restaurant cards double as the tab switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {loading ? (
          <div className="col-span-full text-center py-10 text-gray-400 text-sm">Loading…</div>
        ) : restaurants.map((r) => {
          const selected = r.id === activeId;
          return (
            <div
              key={r.id}
              className={`rounded-xl border-2 p-4 transition-colors cursor-pointer ${
                selected ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
              onClick={() => setActiveId(r.id)}
            >
              <div className="flex items-center gap-2.5 mb-2">
                {r.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.logo_url} alt={r.name} className="w-9 h-9 rounded-lg object-contain bg-white border border-gray-100" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-gray-100" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{r.name}</p>
                  <p className="text-[11px] text-gray-400">{formatSynced(r.last_synced_at)}</p>
                </div>
              </div>

              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-2xl font-bold text-gray-900">{r.item_count}</span>
                <span className="text-[11px] text-gray-500">
                  items · {r.category_count} categories
                </span>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); sync(r.id); }}
                disabled={busy || !r.url}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw size={13} className={syncingId === r.id ? "animate-spin" : ""} />
                {syncingId === r.id ? "Syncing…" : "Sync this menu"}
              </button>
            </div>
          );
        })}
      </div>

      {active && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h2 className="text-base font-semibold text-gray-900">{active.name}</h2>
            {active.url && (
              <a
                href={active.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-orange-600 font-medium hover:underline"
              >
                {active.url.replace(/^https?:\/\//, "")} <ExternalLink size={12} />
              </a>
            )}

            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search items…"
                  className="pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="all">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Photo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {itemsLoading ? (
                  <tr><td colSpan={5} className="text-center py-16 text-gray-400 text-sm">Loading items…</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-gray-400 text-sm">
                      Nothing imported yet — hit &ldquo;Sync this menu&rdquo; to pull the items in.
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-16 text-gray-400 text-sm">No items match that search.</td></tr>
                ) : grouped.map(([categoryName, rows]) => (
                  <Fragment key={categoryName}>
                    <tr className="bg-gray-50/70 border-b border-gray-100">
                      <td colSpan={5} className="px-4 py-2">
                        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">{categoryName}</span>
                        <span className="text-[11px] text-gray-400 ml-2">{rows.length} item{rows.length !== 1 ? "s" : ""}</span>
                      </td>
                    </tr>
                    {rows.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                            {item.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">No img</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800">{item.name}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.price !== null ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white" style={{ background: "#ea580c" }}>
                              {item.currency} {Number(item.price).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.is_available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {item.is_available ? "Listed" : "Removed"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.product_url && (
                            <a
                              href={item.product_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-end gap-1 text-xs text-gray-400 hover:text-orange-600"
                            >
                              View <ExternalLink size={12} />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {!itemsLoading && filtered.length > 0 && (
            <p className="text-xs text-gray-400 mt-3">
              Showing {filtered.length} of {items.length} items.
            </p>
          )}
        </>
      )}
    </div>
  );
}
