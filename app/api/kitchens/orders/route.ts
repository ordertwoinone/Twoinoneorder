export const dynamic = "force-dynamic";

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getLiveKitchenAddonGroups } from "@/lib/kalba/addons-server";
import { getKitchenTables } from "@/lib/kitchen-tables";
import { MAX_GUESTS, priceOrder, type OrderDish } from "@/lib/kitchen-orders";
import { waiterFromToken } from "@/lib/kitchen-waiters";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/** A whole restaurant can share one address, so this only stops a flood. */
const MAX_ORDERS_PER_WINDOW = 30;
const WINDOW_MINUTES = 10;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const clientRef = String(body?.clientRef ?? "").slice(0, 64);
  const guests = Number(body?.guests);
  const lines = Array.isArray(body?.items) ? body.items : [];
  if (!clientRef) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");

  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count, error: countError } = await supabaseAdminLive
    .from("kitchen_orders")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (countError) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if ((count ?? 0) >= MAX_ORDERS_PER_WINDOW) return NextResponse.json({ error: "limit" }, { status: 429 });

  // The table must be a real one, whenever the restaurant has a list of them.
  const tables = await getKitchenTables(true);
  const table = body?.table ? String(body.table) : null;
  const tableOk = tables.length === 0 || tables.some((t) => t.code === table);
  if (!tableOk) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const dishIds = lines.map((l: { dishId?: unknown }) => String(l?.dishId ?? ""));
  if (dishIds.some((id: string) => !UUID.test(id))) return NextResponse.json({ error: "changed" }, { status: 409 });

  const { data: dishes, error: dishError } = await supabaseAdminLive
    .from("kitchen_dishes")
    .select("id, name, price, kitchen")
    .eq("is_active", true)
    .in("id", dishIds);
  if (dishError) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const priced = priceOrder(lines, (dishes ?? []) as OrderDish[], await getLiveKitchenAddonGroups());
  if ("error" in priced) {
    // The menu moved under them: a dish or an add-on has changed since they chose it.
    const changed = priced.error === "unavailable";
    return NextResponse.json({ error: changed ? "changed" : "invalid" }, { status: changed ? 409 : 400 });
  }

  /* A waiter's PIN is optional, but one that was given must still be good.
     Saving the order without them would quietly lose who took it. */
  const waiter = await waiterFromToken(body?.waiterToken);
  if (body?.waiterToken && !waiter) return NextResponse.json({ error: "waiter" }, { status: 401 });

  const { data, error } = await supabaseAdminLive
    .from("kitchen_orders")
    .insert([{
      client_ref: clientRef,
      table_code: table,
      guests,
      waiter_id: waiter?.id ?? null,
      waiter_name: waiter?.name ?? null,
      items: priced.items,
      total: priced.total,
      ip_hash: ipHash,
    }])
    .select("order_number")
    .single();

  if (error?.code === "23505") {
    // The same order sent twice: answer with the one already placed.
    const { data: existing } = await supabaseAdminLive
      .from("kitchen_orders")
      .select("order_number")
      .eq("client_ref", clientRef)
      .single();
    return NextResponse.json({ orderNumber: existing?.order_number }, { status: 200 });
  }
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  return NextResponse.json({ orderNumber: data.order_number }, { status: 201 });
}
