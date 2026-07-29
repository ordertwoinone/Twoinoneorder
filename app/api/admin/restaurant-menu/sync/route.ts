export const dynamic = 'force-dynamic';
// Scraping one storefront means ~15 sequential-ish page fetches.
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { scrapeStore } from "@/lib/takeapp-scraper";

/**
 * Re-import one restaurant's menu from its take.app storefront.
 *
 * Deliberately one restaurant per request: syncing all four in a single call
 * runs well past the function timeout. The admin page loops over them.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const restaurantId: string | undefined = body?.restaurantId;

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
  }

  const { data: restaurant, error: restaurantError } = await supabaseAdminLive
    .from("restaurants")
    .select("id, name, url")
    .eq("id", restaurantId)
    .single();

  if (restaurantError || !restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }
  if (!restaurant.url) {
    return NextResponse.json({ error: `${restaurant.name} has no storefront URL set` }, { status: 400 });
  }

  const startedAt = new Date().toISOString();

  let scraped;
  try {
    scraped = await scrapeStore(restaurant.url);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `Could not read ${restaurant.url}: ${message}` }, { status: 502 });
  }

  if (scraped.items.length === 0) {
    return NextResponse.json(
      {
        error:
          `No items found on ${restaurant.url}. The storefront may have changed its page structure — ` +
          `the importer needs updating.`,
      },
      { status: 502 }
    );
  }

  const syncedAt = new Date().toISOString();
  const rows = scraped.items.map((item) => ({
    restaurant_id: restaurant.id,
    external_id: item.externalId,
    name: item.name,
    price: item.price,
    image_url: item.imageUrl,
    category: item.category,
    category_external_id: item.categoryExternalId,
    product_url: item.productUrl,
    is_available: true,
    last_synced_at: syncedAt,
  }));

  const { error: upsertError } = await supabaseAdminLive
    .from("restaurant_menu_items")
    .upsert(rows, { onConflict: "restaurant_id,external_id" });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Anything not touched by this run is gone from the storefront. Keep the row
  // (it may be referenced elsewhere) but flag it as unavailable.
  const { data: removed } = await supabaseAdminLive
    .from("restaurant_menu_items")
    .update({ is_available: false })
    .eq("restaurant_id", restaurant.id)
    .lt("last_synced_at", startedAt)
    .eq("is_available", true)
    .select("id");

  return NextResponse.json({
    restaurant: restaurant.name,
    imported: rows.length,
    categories: scraped.categoriesFound,
    categoriesFailed: scraped.categoriesFailed.length,
    markedUnavailable: removed?.length ?? 0,
    syncedAt,
  });
}
