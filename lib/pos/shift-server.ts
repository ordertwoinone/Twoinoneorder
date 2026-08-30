import { supabaseAdminLive } from "@/lib/supabase-admin";
import type { PosShift } from "@/lib/pos/shift";

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
