import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/pos/auth";
import { openShiftFor } from "@/lib/pos/shift-server";
import { getPosMenu } from "@/lib/pos/menu-server";
import TillScreen from "./TillScreen";

export const dynamic = "force-dynamic";

export default async function TillPage() {
  const staff = await currentStaff();
  if (!staff) redirect("/pos/login");
  if (!(await openShiftFor(staff.id))) redirect("/pos/shift/open");

  const { settings, categories, items } = await getPosMenu();

  return <TillScreen staff={staff} settings={settings} categories={categories} items={items} />;
}
