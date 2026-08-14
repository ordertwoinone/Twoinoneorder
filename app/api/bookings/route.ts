export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { insertRow } from "@/lib/admin-write";

// Public: save a booking. If the visitor is logged in, link it to their account.
export async function POST(request: Request) {
  const body = await request.json();

  // Identify the logged-in user (if any) from the session cookie
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const row = { ...body, user_id: user?.id ?? null };

  /* insertRow, not a plain insert: the invoice columns arrive with a hand-run
     migration, and a raw insert would reject the whole order rather than drop
     the fields it cannot store. Losing the itemisation beats losing the sale. */
  const { data, error } = await insertRow("bookings", row);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
