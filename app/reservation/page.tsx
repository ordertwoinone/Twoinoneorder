import { redirect } from "next/navigation";

// The old 3D picker was replaced by the full booking flow at /book-table
export default function ReservationPage() {
  redirect("/book-table");
}
