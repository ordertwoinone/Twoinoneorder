"use client";

import { Sparkles } from "lucide-react";

interface Props {
  enabled: boolean;
  order: number;
  /** Called with the field(s) to merge into the edited row. */
  onChange: (patch: { show_in_top_picks?: boolean; top_picks_order?: number }) => void;
}

/**
 * Shared control for the four item areas (buffet menu, buffet popular dishes,
 * Kalba popular, Kalba specials). Switching it on publishes the item to the
 * "Top Picks For You" strip on the home page.
 */
export default function TopPicksField({ enabled, order, onChange }: Props) {
  return (
    <div
      className={`rounded-xl border-2 transition-colors ${
        enabled ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white"
      }`}
    >
      <label className="flex items-start gap-3 px-3.5 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange({ show_in_top_picks: e.target.checked })}
          className="mt-0.5 w-4 h-4 accent-orange-600 cursor-pointer"
        />
        <span className="flex-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
            <Sparkles size={13} className={enabled ? "text-orange-500" : "text-gray-400"} />
            Show in home page Top Picks
          </span>
          <span className="block text-[11px] text-gray-500 mt-0.5">
            Adds this item to the &ldquo;Top Picks For You&rdquo; row on the home page.
          </span>
        </span>
      </label>

      {enabled && (
        <div className="flex items-center gap-2 px-3.5 pb-3 pt-0">
          <label className="text-[11px] font-semibold text-gray-600">Position</label>
          <input
            type="number"
            value={order}
            onChange={(e) => onChange({ top_picks_order: parseInt(e.target.value) || 0 })}
            className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <span className="text-[11px] text-gray-400">lower shows first</span>
        </div>
      )}
    </div>
  );
}
