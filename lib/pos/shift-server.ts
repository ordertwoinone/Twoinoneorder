import { supabaseAdminLive } from "@/lib/supabase-admin";
import type { PosShift, StaleShift } from "@/lib/pos/shift";

/**
 * Reading shifts from the server.
 *
 * Split from lib/pos/shift.ts so the arithmetic there stays importable by the
 * till screens; this half holds the service-role key and must never be reached
 * from a client component.
 */

/** The shift this member of staff has open, or null if they have not started. */
export async function openShiftFor(staffUuid: string): Promise<PosShift | null> {
  const { data, error } = await supabaseAdminLive
    .from("pos_shifts")
    .select("*")
    .eq("staff_uuid", staffUuid)
    .eq("status", "open")
    .maybeSingle();

  if (error || !data) return null;
  return data as PosShift;
}

/**
 * Shifts left open from a previous day.
 *
 * A day that was never closed is a drawer nobody counted and takings nobody
 * signed for, and the longer it sits the less anyone can reconstruct. Nothing
 * here closes it — a shift can only be signed off by someone who has counted
 * the money — but every till screen carries the warning until one is.
 *
 * Branch-wide rather than per-cashier on purpose: the person who left it open
 * is often not the person on shift when it is noticed.
 */
export async function staleShifts(): Promise<StaleShift[]> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data, error } = await supabaseAdminLive
    .from("pos_shifts")
    /* The foreign key has to be named. pos_shifts points at pos_staff twice —
       once for who opened the shift and once for who closed it — and an
       unqualified embed is ambiguous, which PostgREST refuses outright. It
       failed silently behind the guard below, so the warning simply never
       appeared. */
    .select("id, opened_at, shift_label, opened_by:pos_staff!pos_shifts_staff_uuid_fkey(name, staff_id)")
    .eq("status", "open")
    .lt("opened_at", startOfToday.toISOString())
    .order("opened_at", { ascending: true });

  if (error || !data) return [];

  return (data as unknown as {
    id: string;
    opened_at: string;
    shift_label: string;
    opened_by: { name: string; staff_id: string } | null;
  }[]).map((row) => ({
    id: row.id,
    staff_name: row.opened_by?.name || row.opened_by?.staff_id || "Unknown",
    shift_label: row.shift_label,
    opened_at: row.opened_at,
    days_old: Math.max(
      1,
      Math.floor((startOfToday.getTime() - new Date(row.opened_at).getTime()) / 86_400_000) + 1,
    ),
  }));
}
