export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/**
 * Without `restaurantId`: a per-restaurant summary (item count + last sync).
 * With `restaurantId`: that restaurant's imported menu items.
 */
export async function GET(request: Request) {
  // The admin panel must read its own writes. Supabase queries go through
  // fetch, so Next's data cache will otherwise serve a snapshot from before the
  // last toggle — the row reads as "off" while the home page already shows it.
  noStore();

  const restaurantId = new URL(request.url).searchParams.get("restaurantId");

  if (restaurantId) {
    const { data, error } = await supabaseAdminLive
      .from("restaurant_menu_items")
      /* `*` rather than a column list. Naming them meant the Deals columns were
         simply left out when they were added: the switch read back undefined
         and drew itself off while the home page was already showing the item.
         PostgREST also rejects the whole select if one named column is unknown,
         so a list would take the screen down on a database that has not run the
         migration yet — `*` survives both. */
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      .limit(2000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  const [restaurantsRes, itemsRes] = await Promise.all([
    supabaseAdminLive
      .from("restaurants")
      .select("id, name, logo_url, url, is_active")
      .order("created_at", { ascending: false }),
    supabaseAdminLive
      .from("restaurant_menu_items")
      .select("restaurant_id, category, is_available, last_synced_at")
      .limit(5000),
  ]);

  if (restaurantsRes.error) {
    return NextResponse.json({ error: restaurantsRes.error.message }, { status: 500 });
  }

  const items = itemsRes.data ?? [];
  const summary = (restaurantsRes.data ?? []).map((r) => {
    const own = items.filter((i) => i.restaurant_id === r.id);
    const lastSynced = own.reduce<string | null>(
      (max, i) => (!max || i.last_synced_at > max ? i.last_synced_at : max),
      null
    );
    return {
      ...r,
      item_count: own.length,
      available_count: own.filter((i) => i.is_available).length,
      category_count: new Set(own.map((i) => i.category).filter(Boolean)).size,
      last_synced_at: lastSynced,
    };
  });

  return NextResponse.json(summary);
}
