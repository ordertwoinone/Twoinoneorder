"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, Trash2, X } from "lucide-react";
import ItemOptionsSheet from "@/components/kalba/ItemOptionsSheet";
import { addonSummary, addonsTotal, type KalbaAddonGroup } from "@/lib/kalba/addons";
import { roundMoney } from "@/lib/kalba/pricing";
import { KITCHEN_LABELS } from "@/lib/kitchens";
import type { Kitchen } from "@/data/kitchenDishes";
import { money } from "../OrderMoneyCard";

interface MenuDish {
  id: string;
  name: string;
  price: number | string;
  kitchen: string;
  meal: string;
}

interface Line {
  dish: MenuDish;
  qty: number;
  addonIds: string[];
}

/** Choose more items for a served order, then send them to the kitchen. */
export default function AddItemsDialog({
  orderId, orderLabel, onClose, onSent,
}: {
  orderId: string;
  orderLabel: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [dishes, setDishes] = useState<MenuDish[]>([]);
  const [groups, setGroups] = useState<Record<string, KalbaAddonGroup[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [choosing, setChoosing] = useState<MenuDish | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/admin/kitchens/served/menu")
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => null) }))
      .catch(() => ({ ok: false, data: null }))
      .then(({ ok, data }) => {
        setLoading(false);
        if (!ok || !Array.isArray(data?.dishes)) {
          setError(data?.error ?? "Could not load the menu.");
          return;
        }
        setDishes(data.dishes);
        setGroups(data.groups ?? {});
      });
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? dishes.filter((d) => d.name.toLowerCase().includes(q)) : dishes;
  }, [dishes, search]);

  const unit = (line: Line) =>
    roundMoney(Number(line.dish.price) + addonsTotal(groups[line.dish.id] ?? [], line.addonIds));
  const total = roundMoney(lines.reduce((sum, l) => sum + unit(l) * l.qty, 0));

  function addLine(dish: MenuDish, qty: number, addonIds: string[]) {
    setLines((prev) => {
      const same = prev.findIndex(
        (l) => l.dish.id === dish.id && [...l.addonIds].sort().join() === [...addonIds].sort().join(),
      );
      if (same === -1) return [...prev, { dish, qty, addonIds }];
      return prev.map((l, i) => (i === same ? { ...l, qty: l.qty + qty } : l));
    });
  }

  function pick(dish: MenuDish) {
    if (groups[dish.id]?.length) setChoosing(dish);
    else addLine(dish, 1, []);
  }

  const changeQty = (index: number, qty: number) =>
    setLines((prev) => (qty < 1 ? prev.filter((_, i) => i !== index) : prev.map((l, i) => (i === index ? { ...l, qty } : l))));

  async function send() {
    setSending(true);
    setError("");
    const res = await fetch(`/api/admin/kitchens/served/${orderId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: lines.map((l) => ({ dishId: l.dish.id, qty: l.qty, addonIds: l.addonIds })) }),
    }).catch(() => null);
    setSending(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error ?? "Could not add these items. Please try again.");
      return;
    }
    onSent();
  }

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/40">
      <div role="dialog" aria-modal="true" aria-label={`Add items to ${orderLabel}`} className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Add items to {orderLabel}</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-6 md:grid-cols-2 md:overflow-hidden">
          <div className="flex min-h-0 flex-col">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes"
              aria-label="Search dishes"
              className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <ul className="min-h-0 flex-1 divide-y divide-gray-100 md:overflow-y-auto">
              {loading ? (
                <li className="py-8 text-center text-sm text-gray-400">Loading...</li>
              ) : visible.length === 0 ? (
                <li className="py-8 text-center text-sm text-gray-400">No dishes found.</li>
              ) : visible.map((dish) => (
                <li key={dish.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-800">{dish.name}</span>
                    <span className="block text-xs text-gray-500">
                      {KITCHEN_LABELS[dish.kitchen as Kitchen] ?? dish.kitchen} · {money(Number(dish.price))}
                    </span>
                  </span>
                  <button onClick={() => pick(dish)} aria-label={`Add ${dish.name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={{ background: "#ea580c" }}>
                    <Plus size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex min-h-0 flex-col rounded-xl bg-gray-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">New items</p>
            {lines.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Nothing added yet.</p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-3 md:overflow-y-auto">
                {lines.map((line, i) => {
                  const extras = addonSummary(groups[line.dish.id] ?? [], line.addonIds, (a) => a.name);
                  return (
                    <li key={`${line.dish.id}-${i}`}>
                      <div className="flex justify-between gap-2">
                        <span className="text-sm font-medium text-gray-800">{line.dish.name}</span>
                        <span className="shrink-0 text-sm text-gray-600">{money(roundMoney(unit(line) * line.qty))}</span>
                      </div>
                      {extras && <p className="text-xs text-gray-500">{extras}</p>}
                      <div className="mt-1 flex items-center gap-1.5">
                        <button onClick={() => changeQty(i, line.qty - 1)} aria-label={`Fewer ${line.dish.name}`} className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700">
                          {line.qty === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                        </button>
                        <span className="w-5 text-center text-sm font-semibold">{line.qty}</span>
                        <button onClick={() => changeQty(i, line.qty + 1)} aria-label={`More ${line.dish.name}`} className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700">
                          <Plus size={12} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4">
          {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
          <div className="flex items-center justify-end gap-3">
            <button onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
            <button onClick={send} disabled={sending || lines.length === 0} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ea580c" }}>
              {sending ? "Sending..." : `Send to kitchen · ${money(total)}`}
            </button>
          </div>
        </div>
      </div>

      {choosing && (
        <ItemOptionsSheet
          key={choosing.id}
          item={{ id: choosing.id, name: choosing.name, numericPrice: Number(choosing.price) }}
          groups={groups[choosing.id] ?? []}
          mode="add"
          onConfirm={(selection, qty) => {
            addLine(choosing, qty, selection);
            setChoosing(null);
          }}
          onClose={() => setChoosing(null)}
        />
      )}
    </div>,
    document.body,
  );
}
