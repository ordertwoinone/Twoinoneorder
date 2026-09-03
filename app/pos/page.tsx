import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/pos/auth";
import { openShiftFor } from "@/lib/pos/shift-server";
import { can, landingFor } from "@/lib/pos/permissions";

export const dynamic = "force-dynamic";

/**
 * The way in.
 *
 * Three states, in order: not signed in, signed in without a shift, and ready
 * to sell. Each is a redirect rather than a screen with three modes, so a
 * tablet that reloads mid-shift lands exactly where it left off.
 *
 * Where "ready to sell" lands now depends on what the account may open rather
 * than on its role. Somebody who works the board but never the till used to be
 * sent to count a float and then to a till they could not use.
 */
export default async function PosPage() {
  const staff = await currentStaff();
  if (!staff) redirect("/pos/login");

  /* Anyone who does not take money skips the drawer entirely and goes to the
     first screen they do have — the kitchen board for a cook, the availability
     list for someone who only marks stock. */
  if (!can(staff, "till")) redirect(landingFor(staff) ?? "/pos/no-access");

  const shift = await openShiftFor(staff.id);
  // Nobody takes money before the drawer has been counted.
  if (!shift) redirect("/pos/shift/open");

  redirect("/pos/till");
}
