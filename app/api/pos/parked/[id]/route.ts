export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";

/** Discarding a held basket. Scoped to the owner, so one cashier cannot drop another's. */
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { error } = await supabaseAdminLive
    .from("pos_parked_orders")
    .delete()
    .eq("id", params.id)
    .eq("staff_uuid", staff.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
