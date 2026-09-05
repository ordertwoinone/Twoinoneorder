export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
import { can } from "@/lib/pos/permissions";

/**
 * Shifts that have been closed, and the photograph taken when they were.
 *
 * The picture was being stored and never shown, which makes it a camera nobody
 * can see the output of — the opposite of what supabase/pos_operations.sql says
 * it is for. A deterrent people know about changes behaviour; one that is only
 * ever written to a column does not.
 *
 * So it is here, beside the figure it belongs to: who closed, what the drawer
 * came to, and how far off it was. A blank where a photo should be is itself
 * worth seeing — it means a shift was signed off with nobody's face on it.
 */
export async function GET(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(staff, "reports")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const limit = Math.min(
    100,
    Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 30),
  );

  const { data, error } = await supabaseAdminLive
    .from("pos_shifts")
    .select(
      "id, shift_label, business_date, opened_at, closed_at, opening_float, closing_cash, expected_cash, difference, net_sales, order_count, closing_note, close_photo_url, opened_by:pos_staff!pos_shifts_staff_uuid_fkey(name, staff_id), closed_by_staff:pos_staff!pos_shifts_closed_by_fkey(name, staff_id)",
    )
    .eq("status", "closed")
    .order("closed_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
    return Number.isFinite(n) ? n : 0;
  };

  return NextResponse.json({
    shifts: (data as unknown as Record<string, unknown>[]).map((row) => {
      const opened = row.opened_by as { name?: string; staff_id?: string } | null;
      const closed = row.closed_by_staff as { name?: string; staff_id?: string } | null;
      return {
        id: String(row.id),
        label: String(row.shift_label ?? ""),
        businessDate: (row.business_date as string | null) ?? "",
        openedAt: String(row.opened_at ?? ""),
        closedAt: (row.closed_at as string | null) ?? "",
        openedBy: opened?.name || opened?.staff_id || "Unknown",
        /* Who signed it off, which is not always who opened it — a handover
           mid-shift is exactly the case the photograph exists for. */
        closedBy: closed?.name || closed?.staff_id || "",
        openingFloat: num(row.opening_float),
        countedCash: num(row.closing_cash),
        expectedCash: num(row.expected_cash),
        difference: num(row.difference),
        netSales: num(row.net_sales),
        orderCount: Math.round(num(row.order_count)),
        note: String(row.closing_note ?? ""),
        photo: String(row.close_photo_url ?? ""),
      };
    }),
  });
}
