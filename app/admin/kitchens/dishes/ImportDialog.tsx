"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Kitchen } from "@/data/kitchenDishes";
import { KITCHEN_LABELS, MEAL_LABELS } from "@/lib/kitchens";
import { parseMenuFile, type ParsedMenu } from "@/lib/kitchens-import";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
const labelCls = "block text-xs font-semibold text-gray-700 mb-1.5";

interface ImportResult {
  created: number;
  updated: number;
  failed: { name: string; error: string }[];
  droppedColumns: string[];
}

export default function ImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [menu, setMenu] = useState<ParsedMenu | null>(null);
  const [fileError, setFileError] = useState("");
  const [kitchen, setKitchen] = useState<Kitchen | "">("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function chooseFile(file: File | undefined) {
    setMenu(null);
    setFileError("");
    setSaveError("");
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError("That file is larger than 5 MB.");
      return;
    }
    try {
      const parsed = parseMenuFile(new Uint8Array(await file.arrayBuffer()));
      setMenu(parsed);
      setKitchen(parsed.kitchen ?? "");
    } catch (e) {
      setFileError((e as Error).message);
    }
  }

  async function handleImport() {
    if (!menu || !kitchen) return;
    setSaving(true);
    setSaveError("");
    const res = await fetch("/api/admin/kitchens/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kitchen, active, dishes: menu.dishes }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      setSaveError(data?.error ?? "Could not import these dishes.");
      return;
    }
    setResult(data);
    onImported();
  }

  const addonCount = menu?.dishes.reduce((n, d) => n + d.addons.length, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Import dishes from Excel</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {result ? (
          <div className="px-6 py-5 space-y-3 overflow-y-auto">
            <p className="text-sm text-gray-800">
              <strong>{result.created}</strong> added, <strong>{result.updated}</strong> updated.
            </p>
            {result.droppedColumns.length > 0 && (
              <p role="alert" className="text-sm text-red-600">
                The add-ons weren&apos;t saved. Run supabase/kitchen_addons.sql in the Supabase SQL editor, then import again.
              </p>
            )}
            {result.failed.length > 0 && (
              <div role="alert" className="text-sm text-red-600">
                <p className="font-semibold">{result.failed.length} couldn&apos;t be saved:</p>
                <ul className="list-disc ps-5">
                  {result.failed.map((f, i) => <li key={i}>{f.name}: {f.error}</li>)}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#ea580c" }}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0 flex-1">
              <div>
                <label htmlFor="ki-file" className={labelCls}>Excel file (.xlsx)</label>
                <input id="ki-file" type="file" accept=".xlsx" onChange={(e) => chooseFile(e.target.files?.[0])} className="block w-full text-sm" />
                <p className="text-[11px] text-gray-500 mt-1">
                  Columns: Category (Breakfast, Lunch or Dinner), Item name, Description, a price column headed Price or twoinone, and optional add on columns.
                </p>
              </div>

              {fileError && <p role="alert" className="text-sm text-red-600">{fileError}</p>}

              {menu && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="ki-kitchen" className={labelCls}>Kitchen for all these dishes</label>
                      <select id="ki-kitchen" value={kitchen} onChange={(e) => setKitchen(e.target.value as Kitchen | "")} className={`${inputCls} bg-white`}>
                        <option value="">Choose…</option>
                        {(Object.keys(KITCHEN_LABELS) as Kitchen[]).map((id) => <option key={id} value={id}>{KITCHEN_LABELS[id]}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 self-end pb-2.5">
                      <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                      Show new dishes on the page
                    </label>
                  </div>

                  {menu.problems.length > 0 && (
                    <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                      <p className="font-semibold mb-1">{menu.problems.length} row{menu.problems.length !== 1 ? "s" : ""} will be skipped. Fix the file and upload it again to include them:</p>
                      <ul className="list-disc ps-4 space-y-0.5">
                        {menu.problems.map((p) => <li key={p.row}>Row {p.row}, {p.name}: {p.reason}</li>)}
                      </ul>
                    </div>
                  )}

                  {addonCount > 0 && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                      The file has no add-on prices, so its {addonCount} add-on{addonCount !== 1 ? "s" : ""} will be free until you set a price on each dish.
                    </p>
                  )}

                  <div>
                    <p className={labelCls}>{menu.dishes.length} dish{menu.dishes.length !== 1 ? "es" : ""} ready to import</p>
                    <div className="rounded-lg border border-gray-200 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                            <th className="px-3 py-2 font-semibold">Meal</th>
                            <th className="px-3 py-2 font-semibold">Dish</th>
                            <th className="px-3 py-2 font-semibold">Price</th>
                            <th className="px-3 py-2 font-semibold">Add-ons</th>
                          </tr>
                        </thead>
                        <tbody>
                          {menu.dishes.map((d) => (
                            <tr key={`${d.meal}-${d.name}`} className="border-b border-gray-100 last:border-0">
                              <td className="px-3 py-2 whitespace-nowrap">{MEAL_LABELS[d.meal]}</td>
                              <td className="px-3 py-2 font-medium text-gray-800">{d.name}</td>
                              <td className="px-3 py-2 whitespace-nowrap">AED {d.price.toFixed(2)}</td>
                              <td className="px-3 py-2 text-gray-500">{d.addons.map((a) => a.name).join(", ") || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-500">
                    A dish already on the menu with the same name, meal and kitchen only has its price and description updated. New dishes start with no photo and Serves 1.
                  </p>
                </>
              )}

              {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
              <button
                onClick={handleImport}
                disabled={saving || !menu || !kitchen || menu.dishes.length === 0}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#ea580c" }}
              >
                {saving ? "Importing..." : menu ? `Import ${menu.dishes.length} dish${menu.dishes.length !== 1 ? "es" : ""}` : "Import"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
