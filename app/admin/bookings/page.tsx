import { redirect } from "next/navigation";

/**
 * Bookings live on the orders board now.
 *
 * A table booking and a take.app order are both somebody expecting food at a
 * time, so keeping them on separate screens meant checking two places during a
 * shift. This redirect is for links and bookmarks that predate the merge.
 */
export default function BookingsPage() {
  redirect("/admin/live-orders");
}
