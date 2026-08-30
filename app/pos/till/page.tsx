import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/pos/auth";
import { openShiftFor } from "@/lib/pos/shift-server";
import TillHolding from "./TillHolding";

export const dynamic = "force-dynamic";

/**
 * The till itself.
 *
 * Order entry lands here next — the menu grid, the cart and the payment panel
 * from the third mockup. For now this confirms the shift is open and gives the
 * two controls that already work, so the login and shift flow can be used and
 * tested end to end rather than dead-ending on a blank page.
 */
export default async function TillPage() {
  const staff = await currentStaff();
  if (!staff) redirect("/pos/login");

  const shift = await openShiftFor(staff.id);
  if (!shift) redirect("/pos/shift/open");

  return <TillHolding staff={staff} shift={shift} />;
}
