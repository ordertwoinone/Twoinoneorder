import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePermission } from "@/lib/pos/guard";
import { staleShifts } from "@/lib/pos/shift-server";
import AvailabilityScreen from "./AvailabilityScreen";

export const dynamic = "force-dynamic";

/**
 * Behind its own permission rather than behind a shift.
 *
 * A cook has no drawer and never opens one, and marking the tea as finished is
 * exactly the sort of thing they should be able to do — requireShift() would
 * have sent them off to count a float they will never touch.
 */
export default async function AvailabilityPage() {
  const staff = await requirePermission("availability");

  const [hero, stale] = await Promise.all([
    supabaseAdmin.from("kalba_hero").select("name").limit(1).maybeSingle(),
    staleShifts(),
  ]);

  return (
    <AvailabilityScreen
      staff={staff}
      branch={hero.data?.name?.trim() || "University Kalba"}
      stale={stale}
    />
  );
}
