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

  /* Named columns, not `*`. The board polls itself every few seconds on every
     tablet in the branch, and a booking row carries an address, a raw payload
     and a notes blob that no card on this screen renders. */
  let query = supabaseAdminLive
    .from("bookings")
    .select(
      "id, type, order_number, status, order_type, table_section, guest_name, phone, items, total_amount, payment_method, created_at",
    )
    .in("type", ["pos", "kiosk"])
    .order("created_at", { ascending: false })
    .limit(120);

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

const PAYMENTS = ["cash", "card", "online"];

/**
 * Advancing an order, and taking the money for one that arrived unpaid.
 *
 * A kiosk order is placed without payment — the customer pays at the counter
 * when they collect. Recording that here does two things, and the second is the
 * one that matters: it sets how it was paid, and it attaches the order to the
 * cashier's open shift.
 *
 * Without that attachment the money is invisible to the day close, which counts
 * orders by shift. The cash would sit in the drawer having been rung up
 * nowhere, and every close would read over by exactly the day's kiosk takings.
 */
export async function PUT(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const status = String(body?.status ?? "");
  const payment = String(body?.payment ?? "");
  const id = String(body?.id ?? "");

  if (!id) return NextResponse.json({ error: "Unknown order" }, { status: 400 });
  if (!status && !payment) {
    return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  }
  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  }
  if (payment && !PAYMENTS.includes(payment)) {
    return NextResponse.json({ error: "Unknown payment method" }, { status: 400 });
  }

  /* Moving an order along is the kitchen's whole job; touching the money is
     not, and they have no shift for it to land on. */
  if (payment && staff.role === "kitchen") {
    return NextResponse.json({ error: "Kitchen accounts cannot take payment" }, { status: 403 });
  }

  /* Cancelling is a manager's call. It puts a refund into the day's figures,
     and the drawer has to answer for it at close. */
  if (status === "cancelled" && staff.role !== "manager") {
    return NextResponse.json(
      { error: "Cancelling an order needs a manager. Ask one to sign in." },
      { status: 403 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (status) patch.status = status;

  if (payment) {
    patch.payment_method = payment;

    const shift = await openShiftFor(staff.id);
    if (!shift) {
      return NextResponse.json(
        { error: "Open your shift before taking payment" },
        { status: 409 },
      );
    }

    /* Only claimed if it is not already on one. A till order belongs to the
       shift that rang it up, and re-pointing it at whoever happened to touch it
       later would move takings between two people's drawers. */
    const { data: existing } = await supabaseAdminLive
      .from("bookings")
      .select("pos_shift_id")
      .eq("id", id)
      .maybeSingle();

    if (!(existing as { pos_shift_id?: string | null } | null)?.pos_shift_id) {
      patch.pos_shift_id = shift.id;
      patch.pos_staff_uuid = staff.id;
    }
  }

  const { data, error } = await supabaseAdminLive
    .from("bookings")
    .update(patch)
    .eq("id", id)
    .in("type", ["pos", "kiosk"])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
