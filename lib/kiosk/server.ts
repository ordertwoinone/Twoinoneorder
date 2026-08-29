/**
 * Reading everything a kiosk screen needs, in one round trip.
 *
 * Used twice: the page renders from it so the screen paints instantly at boot,
 * and /api/kiosk/menu answers with it so a screen that has been standing all
 * day picks up a price change without anyone touching it.
 *
 * Every read goes through the live client. The cacheable one is right for the
 * public pages, which want ISR — but it is exactly wrong here: the kiosk polls
 * this to find out what changed, and Next would keep answering with the copy it
 * took the first time. That is not a stale price on a web page nobody reloads;
 * it is a screen selling yesterday's menu until someone restarts the browser.
 */

import { supabaseAdminLive } from "@/lib/supabase-admin";
import { getLiveAddonGroupsByItem } from "@/lib/kalba/addons-server";
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
    supabaseAdminLive.from("kiosk_settings").select("*").limit(1).maybeSingle(),
    supabaseAdminLive.from("kiosk_ads").select("*").eq("is_active", true).order("sort_order").order("created_at"),
    // The kiosk sells the Kalba menu, so it reads the Kalba tables — same rows,
    // same order, as the branch page and /menu.
    supabaseAdminLive.from("kalba_categories").select("*").eq("is_active", true).order("sort_order").order("created_at"),
    supabaseAdminLive.from("kalba_popular_items").select("*").eq("is_active", true).order("sort_order"),
    getLiveAddonGroupsByItem(),
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
