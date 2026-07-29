export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Without `restaurantId`: a per-restaurant summary (item count + last sync).
 * With `restaurantId`: that restaurant's imported menu items.
 */
export async function GET(request: Request) {
  const restaurantId = new URL(request.url).searchParams.get("restaurantId");

  if (restaurantId) {
    const { data, error } = await supabaseAdmin
      .from("restaurant_menu_items")
      .select("id, external_id, name, price, currency, image_url, category, product_url, is_available, show_in_top_picks, top_picks_order, last_synced_at")
      .eq("restaurant_id", restaurantId)
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      .limit(2000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  const [restaurantsRes, itemsRes] = await Promise.all([
    supabaseAdmin
      .from("restaurants")
      .select("id, name, logo_url, url, is_active")
      .order("created_at", { ascending: false }),
    supabaseAdmin
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
