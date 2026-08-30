export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
import { openShiftFor } from "@/lib/pos/shift-server";
import { getPosSettings } from "@/lib/pos/menu-server";

/**
 * The order board behind the till: everything the branch is working on, whoever
 * took it.
 *
 * Both sources on one list on purpose. A kitchen does not care whether a burger
 * was ordered at the counter or on the standing screen, and making staff watch
 * two boards is how the kiosk order gets forgotten. `source` is what tells them
 * apart when it matters.
 */
const STATUSES = ["pending", "confirmed", "completed", "cancelled"];

export async function GET(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "").trim();
  const scope = searchParams.get("scope") ?? "today";

  let query = supabaseAdminLive
    .from("bookings")
    .select("*")
    .in("type", ["pos", "kiosk"])
    .order("created_at", { ascending: false })
    .limit(300);

  if (STATUSES.includes(status)) query = query.eq("status", status);

  /* "Today" means since this shift opened, not since midnight — an evening
     shift running past twelve should keep showing its own orders. */
  if (scope === "shift") {
    const shift = await openShiftFor(staff.id);
    if (shift) query = query.gte("created_at", shift.opened_at);
  } else if (scope === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    query = query.gte("created_at", start.toISOString());
  }

  const [ordersRes, settings] = await Promise.all([query, getPosSettings()]);

  if (ordersRes.error) {
    return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    orders: (ordersRes.data ?? []).map((o) => {
      const row = o as Record<string, unknown>;
      return { ...row, source: row.type === "kiosk" ? "Kiosk" : "Till" };
    }),
    orderPrefix: settings.order_prefix,
    staff,
  });
}

/** Advancing an order: preparing, ready, cancelled. */
export async function PUT(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const status = String(body?.status ?? "");
  const id = String(body?.id ?? "");

  if (!STATUSES.includes(status) || !id) {
    return NextResponse.json({ error: "Unknown order or status" }, { status: 400 });
  }

  /* Cancelling is a manager's call. It puts a refund into the day's figures,
     and the drawer has to answer for it at close. */
  if (status === "cancelled" && staff.role !== "manager") {
    return NextResponse.json(
      { error: "Cancelling an order needs a manager. Ask one to sign in." },
      { status: 403 },
    );
  }

  const { data, error } = await supabaseAdminLive
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .in("type", ["pos", "kiosk"])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
