"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Info, PackageX, RefreshCw, Search } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import type { PosStaff } from "@/lib/pos/constants";
import type { StaleShift } from "@/lib/pos/shift";
import PosShell from "@/components/pos/PosShell";
import StaleShiftWarning from "@/components/pos/StaleShiftWarning";
import { sizedImage } from "@/lib/image-url";

/**
 * Item Availability.
 *
 * The switch a cook reaches for at seven in the evening when the tea runs out.
 * One list, one toggle per dish, and the sentence at the bottom saying exactly
 * where the switch reaches — because the thing that stops people using a screen
 * like this is not knowing whether they have just taken the dish off the
 * website as well.
 *
 * Optimistic on purpose. The tap flips the row immediately and the request
 * follows; a cook standing at a tablet with a queue in front of them will press
 * a switch that has not moved again, and again, and then stop trusting it. If
 * the write fails the row flips back and says so.
 */

interface Item {
  id: string;
  name: string;
  price: string | number | null;
  image_url: string;
  category_id: string | null;
  is_available: boolean;
  changed_at: string | null;
}

interface Category {
  id: string;
  label: string;
  emoji: string;
}

type Tab = "all" | "available" | "out";

/** The four columns, kept in one place so the header cannot drift off the rows. */
const COLUMNS = "1fr 200px 160px 150px";

export default function AvailabilityScreen({
  staff,
  branch,
  stale = [],
}: {
  staff: PosStaff;
  branch: string;
  stale?: StaleShift[];
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [error, setError] = useState("");
  /** Ids mid-flight, so a double tap cannot race itself. */
  const [saving, setSaving] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch("/api/pos/availability", { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (body?.items) {
      setItems(body.items as Item[]);
      setCategories((body.categories ?? []) as Category[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const categoryLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.label);
    return map;
  }, [categories]);

  const counts = useMemo(
    () => ({
      all: items.length,
      available: items.filter((i) => i.is_available).length,
      out: items.filter((i) => !i.is_available).length,
    }),
    [items],
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (tab === "available" && !item.is_available) return false;
      if (tab === "out" && item.is_available) return false;
      if (category && item.category_id !== category) return false;
      if (needle && !item.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, tab, category, query]);

  async function toggle(item: Item) {
    if (saving.has(item.id)) return;
    const next = !item.is_available;

    setError("");
    setSaving((s) => new Set(s).add(item.id));
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, is_available: next } : i)));

    const res = await fetch("/api/pos/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_available: next }),
    }).catch(() => null);

    setSaving((s) => {
      const copy = new Set(s);
      copy.delete(item.id);
      return copy;
    });

    if (!res?.ok) {
      /* Put it back where it was. A switch reading "off" while the kiosk is
         still selling the dish is worse than one that refused to move. */
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, is_available: !next } : i)));
      const body = await res?.json().catch(() => null);
      setError(body?.error || `Could not change ${item.name}. Try again.`);
    }
  }

  return (
    <PosShell
      staff={staff}
      title="Item Availability"
      subtitle="Manage menu items for your branch"
      warning={<StaleShiftWarning shifts={stale} />}
      actions={
        <button
          onClick={() => { setRefreshing(true); load(); }}
          className="flex items-center gap-2 rounded-lg px-3.5 text-[13px] font-bold"
          style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 38 }}
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      }
    >
      <div className="pos-scroll h-full p-4">
        <div className="rounded-2xl bg-white" style={{ border: `1px solid ${POS.line}` }}>
          {/* ─── Which branch, and how far the switch reaches ─── */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
            <span
              className="rounded-lg px-3.5 py-2.5 text-[13.5px] font-bold"
              style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
            >
              {branch}
            </span>
            <span className="text-[13px] font-semibold" style={{ color: POS.inkSoft }}>
              POS + Kiosk
            </span>
          </div>

          {/* ─── Narrowing the list ─── */}
          <div className="flex flex-wrap gap-3 px-4 pt-3">
            <label
              className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg px-3"
              style={{ border: `1px solid ${POS.line}`, height: 42 }}
            >
              <Search size={16} style={{ color: POS.inkSoft }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search menu items…"
                className="w-full bg-transparent text-[13.5px] focus:outline-none"
                style={{ color: POS.ink }}
              />
            </label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg bg-white px-3 text-[13.5px] font-semibold focus:outline-none"
              style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 42, minWidth: 200 }}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* ─── All / available / out ─── */}
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {([
              { key: "all", label: "All items", count: counts.all },
              { key: "available", label: "Available", count: counts.available },
              { key: "out", label: "Out of stock", count: counts.out },
            ] as const).map((entry) => {
              const active = tab === entry.key;
              return (
                <button
                  key={entry.key}
                  onClick={() => setTab(entry.key)}
                  className="flex items-center gap-2 rounded-lg px-4 text-[13.5px] font-bold transition-colors"
                  style={{
                    height: 42,
                    background: active ? POS.night : "transparent",
                    color: active ? "#fff" : POS.ink,
                    border: `1px solid ${active ? POS.night : POS.line}`,
                  }}
                >
                  {entry.label}
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[11.5px] font-black"
                    style={{
                      background: active
                        ? "rgba(255,255,255,0.18)"
                        : entry.key === "out"
                          ? POS.badSoft
                          : entry.key === "available"
                            ? POS.goodSoft
                            : POS.page,
                      color: active
                        ? "#fff"
                        : entry.key === "out"
                          ? POS.bad
                          : entry.key === "available"
                            ? POS.good
                            : POS.inkSoft,
                    }}
                  >
                    {entry.count}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <p
              className="mx-4 mt-3 rounded-lg px-3 py-2.5 text-[12.5px] font-semibold"
              style={{ background: POS.badSoft, color: POS.bad }}
            >
              {error}
            </p>
          )}

          {/* ─── The list ─── */}
          <div className="mt-3 px-4">
            <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${POS.line}` }}>
              <div
                className="grid items-center gap-3 px-4 py-3 text-[11.5px] font-bold uppercase tracking-wide"
                style={{
                  gridTemplateColumns: COLUMNS,
                  color: POS.inkSoft,
                  borderBottom: `1px solid ${POS.line}`,
                }}
              >
                <span>Menu item</span>
                <span>Category</span>
                <span>Status</span>
                <span>ON / OFF</span>
              </div>

              {loading ? (
                <p className="py-16 text-center text-[13px]" style={{ color: POS.inkSoft }}>
                  Loading the menu…
                </p>
              ) : shown.length === 0 ? (
                <div className="py-16 text-center">
                  <PackageX size={26} className="mx-auto" style={{ color: "#C9CED3" }} />
                  <p className="mt-3 text-[13.5px] font-bold" style={{ color: POS.ink }}>
                    {items.length === 0 ? "No menu items yet" : "Nothing matches that"}
                  </p>
                  <p className="mt-1 text-[12.5px]" style={{ color: POS.inkSoft }}>
                    {items.length === 0
                      ? "Dishes are added in the admin panel."
                      : "Try a different search or category."}
                  </p>
                </div>
              ) : (
                shown.map((item) => {
                  const busy = saving.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className="grid items-center gap-3 px-4 py-2.5"
                      style={{
                        gridTemplateColumns: COLUMNS,
                        borderBottom: `1px solid ${POS.line}`,
                      }}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        {item.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            // 200 rather than a size nobody else asks for:
                            // fewer variants means the edge cache is already
                            // holding this one from the till grid.
                            src={sizedImage(item.image_url, 200)}
                            alt=""
                            className="h-11 w-14 shrink-0 rounded-lg object-cover"
                            style={{ opacity: item.is_available ? 1 : 0.45 }}
                          />
                        ) : (
                          <span
                            className="h-11 w-14 shrink-0 rounded-lg"
                            style={{ background: POS.page }}
                          />
                        )}
                        <span className="min-w-0">
                          <span
                            className="block truncate text-[14px] font-bold"
                            style={{ color: item.is_available ? POS.ink : POS.inkSoft }}
                          >
                            {item.name}
                          </span>
                          {/* A dish off for three days is usually forgotten
                              rather than out of stock, and the row says so. */}
                          {!item.is_available && item.changed_at && (
                            <span className="block text-[11px]" style={{ color: POS.inkSoft }}>
                              off since {offSince(item.changed_at)}
                            </span>
                          )}
                        </span>
                      </span>

                      <span className="truncate text-[13px]" style={{ color: POS.inkSoft }}>
                        {(item.category_id && categoryLabel.get(item.category_id)) || "—"}
                      </span>

                      <span>
                        <span
                          className="inline-block rounded-md px-2.5 py-1 text-[12px] font-bold"
                          style={{
                            background: item.is_available ? POS.goodSoft : POS.badSoft,
                            color: item.is_available ? POS.good : POS.bad,
                          }}
                        >
                          {item.is_available ? "Available" : "Out of stock"}
                        </span>
                      </span>

                      <span className="flex items-center gap-2.5">
                        <button
                          role="switch"
                          aria-checked={item.is_available}
                          aria-label={`${item.name} — ${item.is_available ? "available" : "out of stock"}`}
                          onClick={() => toggle(item)}
                          disabled={busy}
                          className="relative shrink-0 rounded-full transition-colors disabled:opacity-60"
                          style={{
                            width: 54,
                            height: 30,
                            background: item.is_available ? POS.good : "#C9CED3",
                          }}
                        >
                          <span
                            className="absolute top-1 rounded-full bg-white transition-all"
                            style={{ width: 22, height: 22, left: item.is_available ? 28 : 4 }}
                          />
                        </button>
                        <span
                          className="text-[13px] font-bold"
                          style={{ color: item.is_available ? POS.ink : POS.inkSoft }}
                        >
                          {item.is_available ? "ON" : "OFF"}
                        </span>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ─── What the switch actually does ─── */}
          <p
            className="flex items-center gap-2 px-4 py-4 text-[12.5px]"
            style={{ color: POS.inkSoft }}
          >
            <Info size={15} />
            Availability applies to this branch&apos;s POS and kiosk. The website menu is not
            changed.
          </p>
        </div>
      </div>
    </PosShell>
  );
}

/** "14:20", "yesterday", "3 days ago". */
function offSince(iso: string): string {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) {
    return then.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
