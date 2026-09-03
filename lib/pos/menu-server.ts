import { supabaseAdminLive } from "@/lib/supabase-admin";
import { getLiveAddonGroupsByItem } from "@/lib/kalba/addons-server";
import { sellable } from "@/lib/kiosk/server";
import type { KioskCategory, KioskItem } from "@/lib/kiosk/types";
import { DEFAULT_POS_SETTINGS, type PosSettings } from "@/lib/pos/settings";
import { memo, TTL } from "@/lib/pos/cache";

/**
 * What the till sells, and how it is set up.
 *
 * The same University Kalba menu the kiosk and the branch page read, filtered
 * the same way: a dish with no price is not offered, because a till that can
 * ring up AED 0.00 is a hole in the takings rather than a cosmetic gap.
 *
 * Read live throughout. A till is open for eight hours and a price changed in
 * admin has to reach it — Next's data cache would keep answering with whatever
 * it saw when the shift started.
 *
 * Live, but not on every keystroke. Both reads are held for a few seconds in
 * lib/pos/cache.ts: every navigation on every tablet was re-fetching the same
 * menu, and a branch with three screens open turned one edit's worth of data
 * into a few hundred queries an hour. Switching a dish off clears the entry
 * immediately, so the one edit staff make mid-service is never the stale one.
 */
export interface PosMenu {
  settings: PosSettings;
  categories: KioskCategory[];
  items: KioskItem[];
}

export const getPosSettings = memo<PosSettings>("pos:settings", TTL.settings, async () => {
  const { data } = await supabaseAdminLive.from("pos_settings").select("*").limit(1).maybeSingle();
  if (!data) return DEFAULT_POS_SETTINGS;
  return { ...DEFAULT_POS_SETTINGS, ...(data as Partial<PosSettings>) };
});

/* Named columns. The till needs a name, a price, a picture and its options; the
   Arabic twins, the top-picks flags and the deals ordering are all dead weight
   on a payload that is fetched on every navigation. */
const ITEM_COLUMNS =
  "id, name, description, price, rating, time_text, image_url, category_id, tags, discount_percent, show_in_top_picks, created_at, sort_order";

/**
 * The items, asked for with the availability flag and again without it.
 *
 * supabase/pos_item_availability.sql adds that column, and between deploying
 * this code and running that file PostgREST answers the whole select with a
 * 400 — which would have left the till drawing an empty grid, with a queue in
 * front of it and nothing on screen to say why. Falling back costs one wasted
 * round trip in that window and nothing at all afterwards.
 */
async function readItems() {
  const withFlag = await supabaseAdminLive
    .from("kalba_popular_items")
    .select(`${ITEM_COLUMNS}, is_available`)
    .eq("is_active", true)
    .order("sort_order");

  if (!withFlag.error) return withFlag;

  return supabaseAdminLive
    .from("kalba_popular_items")
    .select(ITEM_COLUMNS)
    .eq("is_active", true)
    .order("sort_order");
}

export const getPosMenu = memo<PosMenu>("pos:menu", TTL.menu, async () => {
  const [settings, catsRes, itemsRes, groupsByItem] = await Promise.all([
    getPosSettings(),
    supabaseAdminLive
      .from("kalba_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at"),
    readItems(),
    getLiveAddonGroupsByItem(),
  ]);

  return {
    settings,
    categories: (catsRes.data ?? []) as KioskCategory[],
    /* Everything is handed over, sold out included. The till draws a dish that
       has run out greyed and refuses to add it, which is what a cashier facing
       a customer asking for it needs — a dish that has simply vanished from the
       grid gets rung up as something else. The kiosk, with nobody to explain,
       hides them instead. */
    items: ((itemsRes.data ?? []) as KioskItem[])
      .filter((item) => sellable(item))
      .map((item) => ({ ...item, addon_groups: groupsByItem[item.id] ?? [] })),
  };
});

/**
 * Both memos, dropped.
 *
 * Called by whatever just wrote to the menu or the settings — the availability
 * toggle, and admin saving POS settings. Without it a cashier switching the tea
 * off would keep seeing it for the length of the window and switch it off
 * again, which is how a screen teaches people not to trust it.
 */
export function invalidatePosMenu(): void {
  getPosMenu.invalidate();
  getPosSettings.invalidate();
}
