export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
import { can } from "@/lib/pos/permissions";
import { openShiftFor } from "@/lib/pos/shift-server";
import { getPosSettings } from "@/lib/pos/menu-server";
import { KITCHEN_TYPES, sourceOrderCode } from "@/lib/order-source";
import { loadSourceDirectory, sourceFrom } from "@/lib/order-source-server";
import {
  isWebsiteBoardId,
  setWebsiteKitchenStatus,
  websiteOrderId,
  websiteOrders,
} from "@/lib/pos/website-orders";

/**
 * The order board behind the till: everything the branch is working on, whoever
 * took it.
 *
 * All three sources on one list on purpose. A kitchen does not care whether a
 * burger was ordered at the counter, on the standing screen or on the website,
 * and making staff watch three boards is how the website order sits unmade
 * until the customer rings. `source` is what tells them apart when it matters.
 *
 * It reads two tables to do it. Counter and kiosk orders are rows in
 * `bookings`; everything ordered on the four storefronts arrives from take.app
 * into `takeapp_orders`. Only the first was ever read here, which is why the
 * website half of the promise above was not being kept — see
 * lib/pos/website-orders.ts for the translation and for the two things about a
 * website order that genuinely differ.
 *
 * Reservations are the one thing left off. A table booking and a buffet enquiry
 * carry no line items and are for a date that may be weeks out, so they would
 * arrive on the board as blank tickets nobody can cook; they stay in the admin
 * panel, where they are answered.
 */
const STATUSES = ["pending", "confirmed", "completed", "cancelled"];

/** What both halves of the board are guaranteed to carry. */
type BoardRow = Record<string, unknown> & { status: string; created_at: string };

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
      "id, type, order_number, status, order_type, table_section, guest_name, phone, items, total_amount, payment_method, created_at, kiosk_device_id, pos_staff_uuid",
    )
    .in("type", KITCHEN_TYPES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(120);

  if (STATUSES.includes(status)) query = query.eq("status", status);

  /* "Today" means since this shift opened, not since midnight — an evening
     shift running past twelve should keep showing its own orders. */
  let since: string;
  if (scope === "shift") {
    const shift = await openShiftFor(staff.id);
    since = shift ? shift.opened_at : startOfToday();
    if (shift) query = query.gte("created_at", shift.opened_at);
  } else if (scope === "today") {
    since = startOfToday();
    query = query.gte("created_at", since);
  } else {
    /* No window asked for. The website half still needs one — take.app holds
       every order the four storefronts have ever taken, and a board that
       fetched all of them would arrive as a month of cold tickets. */
    since = startOfToday();
  }

  const [ordersRes, settings, directory, website] = await Promise.all([
    query,
    getPosSettings(),
    loadSourceDirectory(),
    websiteOrders(since),
  ]);

  if (ordersRes.error) {
    return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
  }

  /* Typed as a bag rather than a shape. The two halves of the board agree on
     the handful of fields the cards read and on nothing else, and spelling out
     a booking row here would be a third copy of a shape that already exists in
     two places. */
  const bookings: BoardRow[] = (ordersRes.data ?? []).map((o) => {
    const row = o as Record<string, unknown>;
    const src = sourceFrom(row, directory);
    /* The code is resolved here rather than on the board, because only the
       server knows which prefix issued it. A website order printed as
       "POS-1122" is worse than no code at all — it points a cashier at a
       shift the order was never on. */
    return {
      ...row,
      status: String(row.status ?? ""),
      created_at: String(row.created_at ?? ""),
      source: src.channel,
      source_label: src.label,
      code: sourceOrderCode(src, row.order_number as number | null),
    };
  });

  /* Filtered after the merge rather than in the query, because the two halves
     keep their status in different columns and a website order's is worked out
     from take.app's plus the branch's own. */
  const merged: BoardRow[] = [...bookings, ...(website as unknown as BoardRow[])].filter((o) =>
    STATUSES.includes(status) ? o.status === status : true,
  );

  // One list, newest first, however it arrived.
  merged.sort(
    (a, b) =>
      new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime(),
  );

  return NextResponse.json({
    orders: merged,
    orderPrefix: settings.order_prefix,
    staff,
  });
}

/** Midnight this morning, as an ISO string. */
function startOfToday(): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
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
  if (payment && !can(staff, "till")) {
    return NextResponse.json({ error: "You are not set up to take payment" }, { status: 403 });
  }

  /* ─── A website order ─── */
  if (isWebsiteBoardId(id)) {
    /* Refused rather than quietly ignored. A website order is not on anybody's
       shift, and the day close counts by shift — marking one "paid cash" at the
       till would put money in the drawer that no reconciliation could account
       for, and every close from then on would read short by that amount. The
       customer paid the storefront; the storefront's record is the one that
       counts. */
    if (payment) {
      return NextResponse.json(
        {
          error:
            "A website order was paid on the storefront. It cannot be paid again at the till.",
        },
        { status: 409 },
      );
    }

    const { error } = await setWebsiteKitchenStatus(websiteOrderId(id), status, staff.id);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ id, status });
  }

  /* Cancelling puts a refund into the day's figures and the drawer has to
     answer for it at close, so it stands behind its own permission rather than
     coming free with the board. */
  if (status === "cancelled" && !can(staff, "void_order")) {
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
    .in("type", KITCHEN_TYPES as unknown as string[])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
