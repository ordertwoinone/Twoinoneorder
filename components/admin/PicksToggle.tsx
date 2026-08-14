"use client";

import { useState } from "react";

export type PicksVariant = "top-picks" | "deals";

const FIELD: Record<PicksVariant, string> = {
  "top-picks": "show_in_top_picks",
  deals: "show_in_deals",
};

const LABEL: Record<PicksVariant, string> = {
  "top-picks": "Show in home page Top Picks",
  deals: "Show in home page Deals You'll Love",
};

interface Props {
  /** Row endpoint, e.g. `/api/admin/kalba/popular/<id>` — PUT accepts a partial body. */
  endpoint: string;
  enabled: boolean;
  /** Which home-page strip this switch publishes to. */
  variant?: PicksVariant;
  /** Update the row in the parent list state (called optimistically, and again to revert on failure). */
  onChange: (value: boolean) => void;
}

/**
 * Inline switch for the strip columns of the item tables. Saves straight away
 * so an item can be pushed to (or pulled from) a home page strip without
 * opening the edit modal.
 */
export default function PicksToggle({ endpoint, enabled, variant = "top-picks", onChange }: Props) {
  const [saving, setSaving] = useState(false);

  async function toggle() {
    if (saving) return;
    const next = !enabled;
    setSaving(true);
    onChange(next);

    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [FIELD[variant]]: next }),
      });
      if (!res.ok) onChange(!next);
    } catch {
      onChange(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={LABEL[variant]}
      onClick={toggle}
      disabled={saving}
      className={`relative inline-flex items-center w-10 h-[22px] rounded-full transition-colors disabled:opacity-60 ${
        enabled
          ? variant === "deals"
            ? "bg-green-500"
            : "bg-orange-500"
          : "bg-gray-200 hover:bg-gray-300"
      }`}
    >
      <span
        className={`absolute w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-[20px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}
