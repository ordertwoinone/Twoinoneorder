export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
import { can } from "@/lib/pos/permissions";
import { invalidatePosMenu } from "@/lib/pos/menu-server";
import { sellable } from "@/lib/kiosk/server";

/**
 * What the branch can actually serve right now.
 *
 * The one thing on the till that a cook needs and a manager should not have to
 * be present for: the green tea has run out, and until tomorrow's delivery it
 * should stop appearing on the kiosk and stop being ringable at the counter.
 *
 * Deliberately not admin → Popular Items → is_active. That flag means "we do
 * not sell this dish", and switching it to say "not tonight" takes the dish off
 * the website and the branch page too — then somebody forgets to switch it back
 * and a seller quietly disappears for a month. This is a separate column with a
 * separate meaning, owned by the people in the building.
 */

interface ItemRow {
  id: string;
  name: string;
  price: string | number | null;
  image_url: string | null;
  category_id: string | null;
  is_available: boolean | null;
  availability_changed_at: string | null;
}

export async function GET() {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(staff, "availability")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const [catsRes, itemsRes] = await Promise.all([
    supabaseAdminLive
      .from("kalba_categories")
      .select("id, label, emoji")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at"),
    /* Only what the list draws. This screen is opened mid-service on a tablet,
       and the Arabic twins, the tags and the add-on groups are all weight it
       never renders. */
    supabaseAdminLive
      .from("kalba_popular_items")
      .select("id, name, price, image_url, category_id, is_available, availability_changed_at")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (itemsRes.error) {
    return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });
  }

  /* Unpriced dishes are left out rather than shown switched off. Neither screen
     will sell one whatever this flag says, so offering a toggle that changes
     nothing is a promise the till cannot keep — that one is fixed in admin. */
  const items = ((itemsRes.data ?? []) as ItemRow[]).filter((item) => sellable(item));

  return NextResponse.json({
    categories: catsRes.data ?? [],
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url ?? "",
      category_id: item.category_id,
      is_available: item.is_available !== false,
      changed_at: item.availability_changed_at,
    })),
  });
}

/** One dish, on or off. */
export async function PUT(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(staff, "availability")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ error: "Unknown item" }, { status: 400 });

  const available = body?.is_available !== false;

  const { data, error } = await supabaseAdminLive
    .from("kalba_popular_items")
    .update({
      is_available: available,
      availability_changed_at: new Date().toISOString(),
      // So the list can say who took it off, and the argument the next morning
      // is about the delivery rather than about who did it.
      availability_changed_by: staff.id,
    })
    .eq("id", id)
    .select("id, is_available, availability_changed_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  /* Both caches dropped on the way out. The till's menu memo would otherwise
     keep serving the dish for its window, and the kiosk's page is statically
     rendered — a customer would still be able to order the thing that has just
     run out, which is the exact failure this screen exists to prevent. */
  invalidatePosMenu();
  revalidatePath("/kiosk");
  revalidatePath("/kiosk/[slug]", "page");

  return NextResponse.json({ ok: true, item: data });
}
