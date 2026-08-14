"use client";

import { Sparkles, Tag } from "lucide-react";
import type { PicksVariant } from "./PicksToggle";

/** What each strip is called, and which columns publish an item to it. */
const CONFIG = {
  "top-picks": {
    icon: Sparkles,
    label: "Show in home page Top Picks",
    hint: "Adds this item to the “Top Picks For You” row on the home page.",
    flag: "show_in_top_picks",
    order: "top_picks_order",
    accent: "border-orange-400 bg-orange-50",
    iconOn: "text-orange-500",
  },
  deals: {
    icon: Tag,
    label: "Show in home page Deals",
    hint: "Adds this item to the “Deals You’ll Love” row on the home page.",
    flag: "show_in_deals",
    order: "deals_order",
    accent: "border-green-400 bg-green-50",
    iconOn: "text-green-600",
  },
} as const;

export interface PicksPatch {
  show_in_top_picks?: boolean;
  top_picks_order?: number;
  show_in_deals?: boolean;
  deals_order?: number;
}

interface Props {
  enabled: boolean;
  order: number;
  variant?: PicksVariant;
  /** Called with the field(s) to merge into the edited row. */
  onChange: (patch: PicksPatch) => void;
}

/**
 * Shared control for every item area — buffet menu, buffet popular dishes,
 * Kalba popular, Kalba specials, imported restaurant menus. Switching it on
 * publishes the item to one of the two home page strips.
 *
 * The same item may be in both: they answer different questions ("what is best
 * here" and "what is cheap today"), and an item can honestly be both.
 */
export default function PicksField({ enabled, order, variant = "top-picks", onChange }: Props) {
  const config = CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-xl border-2 transition-colors ${
        enabled ? config.accent : "border-gray-200 bg-white"
      }`}
    >
      <label className="flex items-start gap-3 px-3.5 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange({ [config.flag]: e.target.checked })}
          className="mt-0.5 w-4 h-4 accent-orange-600 cursor-pointer"
        />
        <span className="flex-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
            <Icon size={13} className={enabled ? config.iconOn : "text-gray-400"} />
            {config.label}
          </span>
          <span className="block text-[11px] text-gray-500 mt-0.5">{config.hint}</span>
        </span>
      </label>

      {enabled && (
        <div className="flex items-center gap-2 px-3.5 pb-3 pt-0">
          <label className="text-[11px] font-semibold text-gray-600">Position</label>
          <input
            type="number"
            value={order}
            onChange={(e) => onChange({ [config.order]: parseInt(e.target.value) || 0 })}
            className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <span className="text-[11px] text-gray-400">lower shows first</span>
        </div>
      )}
    </div>
  );
}
