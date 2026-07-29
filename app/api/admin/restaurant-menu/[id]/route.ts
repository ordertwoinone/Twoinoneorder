export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Only the Top Picks fields are editable here. Everything else on the row is
 * imported from the storefront and would be overwritten by the next sync, so
 * there is nothing to gain from hand-editing it.
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));

  const patch: { show_in_top_picks?: boolean; top_picks_order?: number } = {};
  if (typeof body.show_in_top_picks === "boolean") patch.show_in_top_picks = body.show_in_top_picks;
  if (typeof body.top_picks_order === "number") patch.top_picks_order = body.top_picks_order;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("restaurant_menu_items")
    .update(patch)
    .eq("id", params.id)
    .select("id, show_in_top_picks, top_picks_order")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/"); // Top Picks strip on the home page
  return NextResponse.json(data);
}
