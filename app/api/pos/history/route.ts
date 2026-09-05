export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
import { can } from "@/lib/pos/permissions";
import { KITCHEN_TYPES, sourceOrderCode } from "@/lib/order-source";
import { loadSourceDirectory, sourceFrom } from "@/lib/order-source-server";

/**
 * Every order the branch has taken, not just today's.
 *
 * The board deliberately shows one day: it is a working screen for food that
 * is being cooked, and a month of finished tickets on it would bury the four
 * that matter. This is the other question — "what happened on the twelfth" —
 * and it wants a date range, a search box and pages.
 */

const PAGE = 40;

export async function GET(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(staff, "orders") && !can(staff, "reports")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const page = Math.max(0, Number(params.get("page")) || 0);
  const search = (params.get("q") ?? "").trim().slice(0, 60);
  const status = (params.get("status") ?? "").trim();
  const from = params.get("from");
  const to = params.get("to");

  let query = supabaseAdminLive
    .from("bookings")
    .select(
      "id, type, order_number, status, order_type, table_section, guest_name, phone, items, total_amount, refunded_total, payment_method, created_at, kiosk_device_id, pos_staff_uuid, pos_shift_id",
      { count: "exact" },
    )
    .in("type", KITCHEN_TYPES as unknown as string[])
    .order("created_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1);

  // A waiter's history is their own work, the same way their board is.
  if (can(staff, "own_orders_only")) query = query.eq("pos_staff_uuid", staff.id);

  if (status) query = query.eq("status", status);
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) query = query.gte("created_at", `${from}T00:00:00`);
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    query = query.lt("created_at", end.toISOString());
  }

  /* Name or phone. The order number is a number and would need a different
     operator, so it is matched on the client against the code we build below —
     a page of forty rows, which is cheaper than teaching Postgres to compare a
     prefixed string to an integer column. */
  if (search) {
    query = query.or(`guest_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const [res, directory] = await Promise.all([query, loadSourceDirectory()]);
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });

  return NextResponse.json({
    page,
    pageSize: PAGE,
    total: res.count ?? 0,
    canDelete: can(staff, "void_order"),
    orders: (res.data ?? []).map((o) => {
      const row = o as Record<string, unknown>;
      const src = sourceFrom(row, directory);
      return {
        ...row,
        source: src.channel,
        source_label: src.label,
        code: sourceOrderCode(src, row.order_number as number | null),
      };
    }),
  });
}

/**
 * Deleting an order for good.
 *
 * Refused once its figures have been signed off, and that is the whole of the
 * design here. A shift close freezes what it took onto the shift row and a day
 * close sums those into a report somebody has already sent; deleting an order
 * underneath either one leaves a total that no longer adds up from the orders
 * behind it, and nothing on any screen would ever say why.
 *
 * So: while the shift is still open, an order can be removed — which covers
 * what this is actually for, clearing out test orders and duplicates rung up by
 * mistake. After it is closed, the way to undo an order is to cancel and refund
 * it, which leaves a trail. That is not a smaller hammer, it is the right one.
 */
export async function DELETE(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!can(staff, "void_order")) {
    return NextResponse.json(
      { error: "Deleting an order needs a manager." },
      { status: 403 },
    );
  }

  const id = (new URL(request.url).searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ error: "Unknown order" }, { status: 400 });

  const { data, error: readError } = await supabaseAdminLive
    .from("bookings")
    .select("id, pos_shift_id, created_at")
    .eq("id", id)
    .in("type", KITCHEN_TYPES as unknown as string[])
    .maybeSingle();

  if (readError || !data) return NextResponse.json({ error: "Unknown order" }, { status: 404 });

  const order = data as { id: string; pos_shift_id: string | null };

  if (order.pos_shift_id) {
    const { data: shift } = await supabaseAdminLive
      .from("pos_shifts")
      .select("status, business_date")
      .eq("id", order.pos_shift_id)
      .maybeSingle();

    const row = shift as { status?: string; business_date?: string | null } | null;

    if (row?.status === "closed") {
      return NextResponse.json(
        {
          error:
            "That order is on a shift that has already been closed. Its takings are part of a signed-off total — cancel and refund it instead, so the figures still add up.",
        },
        { status: 409 },
      );
    }

    if (row?.business_date) {
      const { data: day } = await supabaseAdminLive
        .from("pos_business_days")
        .select("id")
        .eq("business_date", row.business_date)
        .maybeSingle();

      if (day) {
        return NextResponse.json(
          { error: "That day has been closed off. Reopen it first, or cancel and refund the order." },
          { status: 409 },
        );
      }
    }
  }

  /* The refunds go with it. They reference the booking and would otherwise be
     rows pointing at nothing — and a refund with no order behind it is the sort
     of thing that turns up in an audit and cannot be explained. */
  await supabaseAdminLive.from("pos_refunds").delete().eq("booking_id", id);

  const { error } = await supabaseAdminLive.from("bookings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
