export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Public: save a booking. If the visitor is logged in, link it to their account.
export async function POST(request: Request) {
  const body = await request.json();

  // Identify the logged-in user (if any) from the session cookie
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const row = { ...body, user_id: user?.id ?? null };

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert([row])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
