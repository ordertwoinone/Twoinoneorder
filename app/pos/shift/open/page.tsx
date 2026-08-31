import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
import { openShiftFor } from "@/lib/pos/shift-server";
import { getPosSettings } from "@/lib/pos/menu-server";
import OpeningCash from "./OpeningCash";

export const dynamic = "force-dynamic";

export default async function OpenShiftPage() {
  const staff = await currentStaff();
  if (!staff) redirect("/pos/login");

  /* A cook has no drawer to count and no till to reach afterwards, so this
     screen would be a dead end for them. */
  if (staff.role === "kitchen") redirect("/pos/kitchen");

  // Already counted in: do not offer to count a second float onto the same day.
  if (await openShiftFor(staff.id)) redirect("/pos/till");

  /* The float has to come from settings. It did not, and the component's own
     default of 500 stood in for it — so a branch that had set 0 in admin was
     still told its correctly counted drawer was AED 500 short. */
  const [heroRes, settings] = await Promise.all([
    supabaseAdmin.from("kalba_hero").select("name").limit(1).maybeSingle(),
    getPosSettings(),
  ]);

  return (
    <OpeningCash
      staff={staff}
      branchName={heroRes.data?.name?.trim() || "Two in One Restaurant"}
      expectedFloat={Number(settings.expected_float) || 0}
    />
  );
}
