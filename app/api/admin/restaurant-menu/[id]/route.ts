export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/**
 * Only the home-strip fields are editable here. Everything else on the row is
 * imported from the storefront and would be overwritten by the next sync, so
 * there is nothing to gain from hand-editing it.
 *
 * The list is a whitelist, so a new strip has to be added to it — leaving the
 * Deals fields out is what made that toggle flick on and snap straight back.
 */
const BOOLEAN_FIELDS = ["show_in_top_picks", "show_in_deals"] as const;
const NUMBER_FIELDS = ["top_picks_order", "deals_order"] as const;

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));

  const patch: Record<string, boolean | number> = {};
  for (const field of BOOLEAN_FIELDS) {
    if (typeof body[field] === "boolean") patch[field] = body[field];
  }
  for (const field of NUMBER_FIELDS) {
    if (typeof body[field] === "number") patch[field] = body[field];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdminLive
    .from("restaurant_menu_items")
    .update(patch)
    .eq("id", params.id)
    // `*`, so the caller can see which fields actually landed.
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/"); // Both strips live on the home page
  return NextResponse.json(data);
}
