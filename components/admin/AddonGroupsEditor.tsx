"use client";

import { Plus, Trash2 } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

/** One add-on. Blank id = not saved yet. */
export interface EditableAddon {
  id?: string;
  name: string;
  name_ar: string;
  image_url: string;
  price: number | string;
  sort_order: number;
}

/** A question the customer is asked, and its add-ons. */
export interface EditableAddonGroup {
  id?: string;
  name: string;
  name_ar: string;
  min_select: number;
  max_select: number;
  sort_order: number;
  options: EditableAddon[];
}

/** The shapes a group can take, in the words an admin would use. */
const GROUP_RULES = [
  { key: "one-required", label: "Required · choose 1", min: 1, max: 1 },
  { key: "one-optional", label: "Optional · choose up to 1", min: 0, max: 1 },
  { key: "many-required", label: "Required · choose several", min: 1, max: 0 },
  { key: "many-optional", label: "Optional · any number", min: 0, max: 0 },
] as const;

const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

function ruleKeyFor(group: EditableAddonGroup): string {
  const found = GROUP_RULES.find((r) => r.min === group.min_select && r.max === group.max_select);
  return found ? found.key : GROUP_RULES[3].key;
}

/** What is wrong with these groups, or null when they can be saved. */
export function addonGroupsProblem(groups: EditableAddonGroup[]): string | null {
  for (const group of groups) {
    if (!group.name.trim()) return "Give every add-on group a name.";
    if (group.options.length === 0) return `Add at least one add-on to "${group.name}".`;
    if (group.options.some((o) => !o.name.trim())) return `Name every add-on in "${group.name}".`;
  }
  return null;
}

export default function AddonGroupsEditor({
  groups,
  onChange,
  folder,
}: {
  groups: EditableAddonGroup[];
  onChange: (groups: EditableAddonGroup[]) => void;
  folder: string;
}) {
  const updateGroup = (gi: number, patch: Partial<EditableAddonGroup>) =>
    onChange(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));

  const updateOptions = (gi: number, options: EditableAddon[]) =>
    updateGroup(gi, { options: options.map((o, i) => ({ ...o, sort_order: i })) });

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold text-gray-700">Add-ons</p>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...groups,
              { name: "", name_ar: "", min_select: 0, max_select: 0, sort_order: groups.length, options: [] },
            ])
          }
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors"
        >
          <Plus size={12} />
          Add group
        </button>
      </div>
      <p className="text-[11px] text-gray-500 mb-2">
        A dish with add-ons opens a popup when a customer adds it. A dish with none goes straight in the cart.
      </p>

      <div className="space-y-3">
        {groups.map((group, gi) => (
          <div key={group.id ?? `new-group-${gi}`} className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) => updateGroup(gi, { name: e.target.value })}
                  placeholder="Group name, e.g. Choose a side"
                  aria-label="Group name"
                  className={inputCls}
                />
                <input
                  type="text"
                  dir="rtl"
                  value={group.name_ar}
                  onChange={(e) => updateGroup(gi, { name_ar: e.target.value })}
                  placeholder="اسم المجموعة بالعربية (اختياري)"
                  aria-label="Group name in Arabic"
                  className={inputCls}
                />
                <select
                  value={ruleKeyFor(group)}
                  onChange={(e) => {
                    const rule = GROUP_RULES.find((r) => r.key === e.target.value);
                    if (rule) updateGroup(gi, { min_select: rule.min, max_select: rule.max });
                  }}
                  aria-label="How many can be chosen"
                  className={`${inputCls} bg-white`}
                >
                  {GROUP_RULES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={() => onChange(groups.filter((_, i) => i !== gi).map((g, i) => ({ ...g, sort_order: i })))}
                aria-label={`Remove ${group.name || "group"}`}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {group.options.map((option, oi) => {
                const patch = (p: Partial<EditableAddon>) =>
                  updateOptions(gi, group.options.map((o, j) => (j === oi ? { ...o, ...p } : o)));
                return (
                  <div key={option.id ?? `new-option-${oi}`} className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-2.5">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="grid grid-cols-[1fr_5.5rem] gap-2">
                        <input
                          type="text"
                          value={option.name}
                          onChange={(e) => patch({ name: e.target.value })}
                          placeholder="Add-on name"
                          aria-label="Add-on name"
                          className={inputCls}
                        />
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={option.price}
                          onChange={(e) => patch({ price: e.target.value })}
                          placeholder="AED"
                          aria-label="Extra charge in AED"
                          title="Extra charge in AED. Leave blank if it is included."
                          className={inputCls}
                        />
                      </div>
                      <input
                        type="text"
                        dir="rtl"
                        value={option.name_ar}
                        onChange={(e) => patch({ name_ar: e.target.value })}
                        placeholder="الاسم بالعربية (اختياري)"
                        aria-label="Add-on name in Arabic"
                        className={inputCls}
                      />
                      <ImageUploadField
                        label="Add-on photo"
                        value={option.image_url}
                        onChange={(url) => patch({ image_url: url })}
                        folder={folder}
                        hint="square, 200×200px"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => updateOptions(gi, group.options.filter((_, j) => j !== oi))}
                      aria-label={`Remove ${option.name || "add-on"}`}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  updateOptions(gi, [
                    ...group.options,
                    { name: "", name_ar: "", image_url: "", price: "", sort_order: group.options.length },
                  ])
                }
                className="flex items-center justify-center gap-1 w-full px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 text-[11px] font-semibold text-gray-500 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-colors"
              >
                <Plus size={12} />
                Add add-on
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
