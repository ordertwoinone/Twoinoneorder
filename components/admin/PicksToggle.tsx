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

/** What to run when the column this switch writes to is missing. */
const MIGRATION: Record<PicksVariant, string> = {
  "top-picks": "supabase/top_picks.sql",
  deals: "supabase/home_deals.sql",
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
  /* The column this switch writes to does not exist yet — the migration adding
     it has not been run. Shown on the switch, because a control that refuses to
     stay on with no explanation reads as broken. */
  const [missing, setMissing] = useState(false);

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

      if (!res.ok) {
        onChange(!next);
        return;
      }

      /* A saved row that comes back without the field means the column is not
         there and the write shed it. The switch has to tell the truth about
         that rather than sit on until the next reload contradicts it. */
      const saved = await res.json().catch(() => null);
      if (saved && typeof saved === "object" && saved[FIELD[variant]] !== next) {
        onChange(!next);
        setMissing(true);
      }
    } catch {
      onChange(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
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

      {missing && (
        <span className="text-[10px] text-amber-700 leading-tight whitespace-nowrap">
          Run <code className="font-mono">{MIGRATION[variant]}</code>
        </span>
      )}
    </span>
  );
}
