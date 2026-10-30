import { redirect } from "next/navigation";

// Dishes lived here first; kept so an old link still lands somewhere.
export default function KitchensAdminIndex() {
  redirect("/admin/kitchens/dishes");
}
