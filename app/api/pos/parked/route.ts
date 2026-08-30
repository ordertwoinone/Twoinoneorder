export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
import { openShiftFor } from "@/lib/pos/shift-server";

/**
 * Held orders.
 *
 * A basket put down while the customer goes to fetch a card or make up their
 * mind, so the till is free for the next person. Not a booking: nothing has
 * been ordered, and a held basket appearing in Order History would be a sale
 * that never happened.
 *
 * Held per member of staff, not per till. Two cashiers sharing a tablet across
 * a shift change should not be handed each other's parked baskets.
 */
export async function GET() {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data, error } = await supabaseAdminLive
    .from("pos_parked_orders")
    .select("*")
    .eq("staff_uuid", staff.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const payload = body?.payload ?? {};

  if (!payload || typeof payload !== "object" || Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "Nothing to hold" }, { status: 400 });
  }

  const shift = await openShiftFor(staff.id);

  const { data, error } = await supabaseAdminLive
    .from("pos_parked_orders")
    .insert([
      {
        staff_uuid: staff.id,
        shift_id: shift?.id ?? null,
        label: String(body?.label ?? "").trim().slice(0, 80),
        payload,
        /* Only so the parked list can show a total without unpacking every
           basket. Nothing is charged from it — a held order is priced again
           from scratch when it is rung up. */
        total_amount: Number(body?.total) || 0,
        item_count: Math.max(0, Math.floor(Number(body?.count) || 0)),
      },
    ])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
