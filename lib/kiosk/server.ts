/**
 * Reading everything a kiosk screen needs, in one round trip.
 *
 * Used twice: the page renders from it so the screen paints instantly at boot,
 * and /api/kiosk/menu answers with it so a screen that has been standing all
 * day picks up a price change without anyone touching it.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAddonGroupsByItem } from "@/lib/kalba/addons-server";
import {
  DEFAULT_KIOSK_SETTINGS,
  type KioskAd,
  type KioskCategory,
  type KioskData,
  type KioskItem,
  type KioskSettings,
} from "@/lib/kiosk/types";

/** Postgres numeric and jsonb both need coaxing back into plain values. */
function normaliseSettings(row: Record<string, unknown> | null): KioskSettings {
  if (!row) return DEFAULT_KIOSK_SETTINGS;
  const ids = row.combo_item_ids;
  return {
    ...DEFAULT_KIOSK_SETTINGS,
    ...(row as unknown as KioskSettings),
    combo_item_ids: Array.isArray(ids) ? (ids as string[]) : [],
  };
}

export async function getKioskData(): Promise<KioskData> {
  const [settingsRes, adsRes, catsRes, itemsRes, groupsByItem] = await Promise.all([
    supabaseAdmin.from("kiosk_settings").select("*").limit(1).maybeSingle(),
    supabaseAdmin.from("kiosk_ads").select("*").eq("is_active", true).order("sort_order").order("created_at"),
    // The kiosk sells the Kalba menu, so it reads the Kalba tables — same rows,
    // same order, as the branch page and /menu.
    supabaseAdmin.from("kalba_categories").select("*").eq("is_active", true).order("sort_order").order("created_at"),
    supabaseAdmin.from("kalba_popular_items").select("*").eq("is_active", true).order("sort_order"),
    getAddonGroupsByItem(),
  ]);

  return {
    settings: normaliseSettings(settingsRes.data as Record<string, unknown> | null),
    // A missing kiosk_ads table means no ads, not a dead screen.
    ads: (adsRes.error ? [] : ((adsRes.data ?? []) as KioskAd[])),
    categories: (catsRes.data ?? []) as KioskCategory[],
    items: ((itemsRes.data ?? []) as KioskItem[]).map((item) => ({
      ...item,
      addon_groups: groupsByItem[item.id] ?? [],
    })),
  };
}
