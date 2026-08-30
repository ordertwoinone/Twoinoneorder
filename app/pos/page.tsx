import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/pos/auth";
import { openShiftFor } from "@/lib/pos/shift-server";

export const dynamic = "force-dynamic";

/**
 * The way in.
 *
 * Three states, in order: not signed in, signed in without a shift, and ready
 * to sell. Each is a redirect rather than a screen with three modes, so a
 * tablet that reloads mid-shift lands exactly where it left off.
 */
export default async function PosPage() {
  const staff = await currentStaff();
  if (!staff) redirect("/pos/login");

  const shift = await openShiftFor(staff.id);
  // You cannot take money before the drawer has been counted.
  if (!shift) redirect("/pos/shift/open");

  redirect("/pos/till");
}
