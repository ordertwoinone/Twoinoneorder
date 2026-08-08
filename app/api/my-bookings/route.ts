export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";

// Returns the bookings belonging to the currently logged-in user.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ bookings: [] });

  /* supabaseAdminLive, not supabaseAdmin: the cacheable client answers this
     from Next's data cache, so a booking the admin panel has since confirmed
     keeps reading "pending" on the customer's own orders page. */
  const { data, error } = await supabaseAdminLive
    .from("bookings")
    .select("id, type, table_id, table_section, seats, guest_name, date, time, guests, notes, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookings: data });
}
