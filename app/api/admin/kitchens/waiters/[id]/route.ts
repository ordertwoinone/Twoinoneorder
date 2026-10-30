export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { isWaiterPin, preparePin } from "@/lib/kitchen-waiters";
import { supabaseAdminLive } from "@/lib/supabase-admin";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: "Enter a name." }, { status: 400 });

  const patch: Record<string, unknown> = {
    name,
    is_active: body?.is_active !== false,
    updated_at: new Date().toISOString(),
  };

  // A blank PIN leaves the current one in place.
  if (body?.pin) {
    if (!isWaiterPin(body.pin)) {
      return NextResponse.json({ error: "The PIN must be exactly 4 digits." }, { status: 400 });
    }
    const prepared = await preparePin(body.pin, params.id);
    if ("error" in prepared) return NextResponse.json({ error: prepared.error }, { status: prepared.status });
    patch.pin_hash = prepared.hash;
    patch.pin_salt = prepared.salt;
  }

  const { data, error } = await supabaseAdminLive
    .from("kitchen_waiters")
    .update(patch)
    .eq("id", params.id)
    .select("id, name, is_active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdminLive.from("kitchen_waiters").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
