export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { isWaiterPin, preparePin } from "@/lib/kitchen-waiters";
import { supabaseAdminLive } from "@/lib/supabase-admin";

// Never the hash or the salt: nothing in the admin panel needs them.
const PUBLIC_COLUMNS = "id, name, is_active, created_at";

export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("kitchen_waiters")
    .select(PUBLIC_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim().slice(0, 120);

  if (!name) return NextResponse.json({ error: "Enter a name." }, { status: 400 });
  if (!isWaiterPin(body?.pin)) {
    return NextResponse.json({ error: "The PIN must be exactly 4 digits." }, { status: 400 });
  }

  const prepared = await preparePin(body.pin);
  if ("error" in prepared) return NextResponse.json({ error: prepared.error }, { status: prepared.status });

  const { data, error } = await supabaseAdminLive
    .from("kitchen_waiters")
    .insert([{ name, is_active: body?.is_active !== false, pin_hash: prepared.hash, pin_salt: prepared.salt }])
    .select(PUBLIC_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
