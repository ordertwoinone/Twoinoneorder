export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { hashPin } from "@/lib/pos/auth";
import { isValidPin, PIN_MAX, PIN_MIN } from "@/lib/pos/constants";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));

  const patch: Record<string, unknown> = {
    name: String(body?.name ?? "").trim().slice(0, 120),
    role: body?.role === "manager" ? "manager" : "cashier",
    is_active: body?.is_active !== false,
    updated_at: new Date().toISOString(),
  };

  if (body?.staff_id) {
    patch.staff_id = String(body.staff_id).trim().toLowerCase().replace(/\s+/g, "").slice(0, 40);
  }

  /* A PIN is only ever written, never read back, so an empty field means "leave
     it alone" rather than "clear it" — otherwise editing someone's name would
     silently lock them out. */
  const pin = String(body?.pin ?? "");
  if (pin) {
    if (!isValidPin(pin)) {
      return NextResponse.json(
        { error: `The PIN must be ${PIN_MIN}–${PIN_MAX} digits` },
        { status: 400 },
      );
    }
    const { hash, salt } = await hashPin(pin);
    patch.pin_hash = hash;
    patch.pin_salt = salt;
    // A new PIN clears whatever lockout the old one had collected.
    patch.failed_attempts = 0;
    patch.locked_until = null;
  }

  if (body?.unlock) {
    patch.failed_attempts = 0;
    patch.locked_until = null;
  }

  const { data, error } = await supabaseAdminLive
    .from("pos_staff")
    .update(patch)
    .eq("id", params.id)
    .select("id, staff_id, name, role, is_active")
    .single();

  if (error) {
    const clash = error.code === "23505";
    return NextResponse.json(
      { error: clash ? "That staff ID is already taken" : error.message },
      { status: clash ? 409 : 500 },
    );
  }

  /* Switching someone off ends their sessions now rather than at expiry. A
     till left signed in on a tablet is the whole reason the switch exists. */
  if (body?.is_active === false) {
    await supabaseAdminLive.from("pos_sessions").delete().eq("staff_uuid", params.id);
  }

  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  /* pos_shifts references staff with ON DELETE RESTRICT, so anyone who has ever
     opened a shift cannot be deleted — their name has to keep meaning something
     on the orders they rang up. Switching them off is the way to retire them. */
  const { error } = await supabaseAdminLive.from("pos_staff").delete().eq("id", params.id);

  if (error) {
    const inUse = error.code === "23503";
    return NextResponse.json(
      {
        error: inUse
          ? "This person has worked a shift, so their record has to stay. Switch them off instead."
          : error.message,
      },
      { status: inUse ? 409 : 500 },
    );
  }
  return NextResponse.json({ success: true });
}
