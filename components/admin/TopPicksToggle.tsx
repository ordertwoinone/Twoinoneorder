"use client";

import { useState } from "react";

interface Props {
  /** Row endpoint, e.g. `/api/admin/kalba/popular/<id>` — PUT accepts a partial body. */
  endpoint: string;
  enabled: boolean;
  /** Update the row in the parent list state (called optimistically, and again to revert on failure). */
  onChange: (value: boolean) => void;
}

/**
 * Inline switch for the "Top Picks" column of the item tables. Saves straight
 * away so an item can be pushed to (or pulled from) the home page strip
 * without opening the edit modal.
 */
export default function TopPicksToggle({ endpoint, enabled, onChange }: Props) {
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
        body: JSON.stringify({ show_in_top_picks: next }),
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
      aria-label="Show in home page Top Picks"
      onClick={toggle}
      disabled={saving}
      className={`relative inline-flex items-center w-10 h-[22px] rounded-full transition-colors disabled:opacity-60 ${
        enabled ? "bg-orange-500" : "bg-gray-200 hover:bg-gray-300"
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
