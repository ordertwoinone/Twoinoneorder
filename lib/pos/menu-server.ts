import { supabaseAdminLive } from "@/lib/supabase-admin";
import { getLiveAddonGroupsByItem } from "@/lib/kalba/addons-server";
import { sellable } from "@/lib/kiosk/server";
import type { KioskCategory, KioskItem } from "@/lib/kiosk/types";
import { DEFAULT_POS_SETTINGS, type PosSettings } from "@/lib/pos/settings";

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
 */
export interface PosMenu {
  settings: PosSettings;
  categories: KioskCategory[];
  items: KioskItem[];
}

export async function getPosSettings(): Promise<PosSettings> {
  const { data } = await supabaseAdminLive.from("pos_settings").select("*").limit(1).maybeSingle();
  if (!data) return DEFAULT_POS_SETTINGS;
  return { ...DEFAULT_POS_SETTINGS, ...(data as Partial<PosSettings>) };
}

export async function getPosMenu(): Promise<PosMenu> {
  const [settings, catsRes, itemsRes, groupsByItem] = await Promise.all([
    getPosSettings(),
    supabaseAdminLive
      .from("kalba_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at"),
    /* Named columns. The till needs a name, a price, a picture and its options;
       the Arabic twins, the top-picks flags and the deals ordering are all
       dead weight on a payload that is fetched on every navigation. */
    supabaseAdminLive
      .from("kalba_popular_items")
      .select(
        "id, name, description, price, rating, time_text, image_url, category_id, tags, discount_percent, show_in_top_picks, created_at, sort_order",
      )
      .eq("is_active", true)
      .order("sort_order"),
    getLiveAddonGroupsByItem(),
  ]);

  return {
    settings,
    categories: (catsRes.data ?? []) as KioskCategory[],
    items: ((itemsRes.data ?? []) as KioskItem[])
      .filter((item) => sellable(item))
      .map((item) => ({ ...item, addon_groups: groupsByItem[item.id] ?? [] })),
  };
}
