export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
import { openShiftFor } from "@/lib/pos/shift-server";

/**
 * Removing an expense keyed in by mistake.
 *
 * Only from the shift that is still open, and only that member of staff's own.
 * A closed shift has been reconciled and signed off, and deleting a line out of
 * it afterwards would silently change a figure somebody has already agreed to.
 */
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const shift = await openShiftFor(staff.id);
  if (!shift) {
    return NextResponse.json(
      { error: "That shift has been closed. Its expenses can no longer be changed." },
      { status: 409 },
    );
  }

  const { error } = await supabaseAdminLive
    .from("pos_expenses")
    .delete()
    .eq("id", params.id)
    .eq("shift_id", shift.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
