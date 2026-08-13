export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { insertRow } from "@/lib/admin-write";
import { getAllAddonsByItem, syncItemAddons, type AddonInput } from "@/lib/kalba/addons-server";

export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("kalba_popular_items")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  /* The editor edits an item and its extras as one thing, so they arrive as one
     thing. Empty for every item until the migration has been run. */
  const byItem = await getAllAddonsByItem();
  const rows = (data ?? []).map((item) => {
    const { id } = item as { id: string };
    return { ...item, addons: byItem[id] ?? [] };
  });

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  // Add-ons live in their own table — they are not a column on the item.
  const { addons, ...fields } = body as { addons?: AddonInput[] } & Record<string, unknown>;

  const { data, error } = await insertRow("kalba_popular_items", fields);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const created = data as { id: string } | null;
  if (created?.id && Array.isArray(addons)) {
    await syncItemAddons(created.id, addons);
  }

  revalidatePath("/restaurant/university-kalba");
  revalidatePath("/restaurant/university-kalba/menu");
  revalidatePath("/"); // Top Picks strip on the home page
  return NextResponse.json(data, { status: 201 });
}
