export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { updateRow } from "@/lib/admin-write";
import { syncItemAddons, type AddonInput } from "@/lib/kalba/addons-server";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  // Add-ons live in their own table — they are not a column on the item.
  const { addons, ...fields } = body as { addons?: AddonInput[] } & Record<string, unknown>;

  const { data, error } = await updateRow("kalba_popular_items", params.id, fields);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  /* Only when the caller sent them: the Top Picks toggle PUTs a single field,
     and must not read as "this item now has no extras". */
  if (Array.isArray(addons)) await syncItemAddons(params.id, addons);

  revalidatePath("/restaurant/university-kalba");
  revalidatePath("/restaurant/university-kalba/menu");
  revalidatePath("/"); // Top Picks strip on the home page
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  /* The add-ons go with it — the foreign key cascades, and deletes them here too
     for a database that has not run the migration that declares it. */
  const { error } = await supabaseAdminLive
    .from("kalba_popular_items")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/restaurant/university-kalba");
  revalidatePath("/restaurant/university-kalba/menu");
  revalidatePath("/"); // Top Picks strip on the home page
  return NextResponse.json({ success: true });
}
