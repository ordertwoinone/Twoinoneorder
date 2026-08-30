import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
import { openShiftFor } from "@/lib/pos/shift-server";
import OpeningCash from "./OpeningCash";

export const dynamic = "force-dynamic";

export default async function OpenShiftPage() {
  const staff = await currentStaff();
  if (!staff) redirect("/pos/login");

  // Already counted in: do not offer to count a second float onto the same day.
  if (await openShiftFor(staff.id)) redirect("/pos/till");

  const { data } = await supabaseAdmin.from("kalba_hero").select("name").limit(1).maybeSingle();

  return <OpeningCash staff={staff} branchName={data?.name?.trim() || "Two in One Restaurant"} />;
}
