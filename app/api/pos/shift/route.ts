export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
import { cleanCounts, countTotal, shiftLabel } from "@/lib/pos/shift";
import { businessDayClosed, currentBusinessDate, openShiftFor } from "@/lib/pos/shift-server";
import { can } from "@/lib/pos/permissions";
import { businessDateLabel } from "@/lib/pos/business-day";

/** The shift the signed-in member of staff currently has open, if any. */
export async function GET() {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const shift = await openShiftFor(staff.id);
  return NextResponse.json({ staff, shift });
}

/** Opens one, with the drawer as it was counted. */
export async function POST(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  /* Coming back to a shift already running is the normal case — a tablet that
     went to sleep, a browser that reloaded — so it is answered with the shift
     rather than an error about starting twice. */
  const existing = await openShiftFor(staff.id);
  if (existing) return NextResponse.json({ shift: existing, resumed: true });

  /* Opening a drawer is taking money, so it stands behind the same permission
     the till does. A kitchen account has never been able to reach this screen;
     now neither can a cashier whose till has been withdrawn. */
  if (!can(staff, "till")) {
    return NextResponse.json({ error: "You are not set up to take orders" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const counts = cleanCounts(body?.counts);

  /* A signed-off day is closed for good. Trading into it would put orders on a
     date whose total has already been counted, printed and sent to management —
     the figures would be right tomorrow and wrong in everybody's records. */
  const businessDate = currentBusinessDate();
  if (await businessDayClosed(businessDate)) {
    return NextResponse.json(
      {
        error: `${businessDateLabel(businessDate)} has already been closed off. A manager has to reopen it before a new shift can start.`,
      },
      { status: 409 },
    );
  }

  const { data, error } = await supabaseAdminLive
    .from("pos_shifts")
    .insert([
      {
        staff_uuid: staff.id,
        status: "open",
        shift_label: shiftLabel(),
        // Which trading day this belongs to, decided once at opening. An
        // evening shift running past midnight keeps the day it started on.
        business_date: businessDate,
        opening_counts: counts,
        // Totalled here, never taken from the screen: the float is the figure
        // the whole day reconciles against.
        opening_float: countTotal(counts),
        opening_note: String(body?.note ?? "").slice(0, 500),
      },
    ])
    .select()
    .single();

  if (error) {
    /* The partial unique index is what stops two open shifts on one account,
       so a race between two tablets surfaces here rather than as two floats. */
    const clash = error.code === "23505";
    if (clash) {
      const shift = await openShiftFor(staff.id);
      if (shift) return NextResponse.json({ shift, resumed: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ shift: data }, { status: 201 });
}
