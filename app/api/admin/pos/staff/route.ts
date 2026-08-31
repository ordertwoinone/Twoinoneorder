export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { hashPin } from "@/lib/pos/auth";
import { isValidPin, PIN_MAX, PIN_MIN } from "@/lib/pos/constants";

const ROLES = ["cashier", "manager", "kitchen"];

/** Lowercase, no spaces — it is typed on a keypad at the start of every shift. */
function cleanStaffId(input: unknown): string {
  return String(input ?? "").trim().toLowerCase().replace(/\s+/g, "").slice(0, 40);
}

export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("pos_staff")
    // Never the hash or the salt. Nothing in the admin panel needs them, and a
    // field that is never sent cannot be leaked by a careless render.
    .select("id, staff_id, name, role, is_active, failed_attempts, locked_until, last_login_at, created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const staffId = cleanStaffId(body?.staff_id);
  const pin = String(body?.pin ?? "");

  if (!staffId) return NextResponse.json({ error: "Give them a staff ID" }, { status: 400 });
  if (!isValidPin(pin)) {
    return NextResponse.json(
      { error: `The PIN must be ${PIN_MIN}–${PIN_MAX} digits` },
      { status: 400 },
    );
  }

  const { hash, salt } = await hashPin(pin);

  const { data, error } = await supabaseAdminLive
    .from("pos_staff")
    .insert([
      {
        staff_id: staffId,
        name: String(body?.name ?? "").trim().slice(0, 120),
        role: ROLES.includes(body?.role) ? body.role : "cashier",
        is_active: body?.is_active !== false,
        pin_hash: hash,
        pin_salt: salt,
      },
    ])
    .select("id, staff_id, name, role, is_active")
    .single();

  if (error) {
    const clash = error.code === "23505";
    return NextResponse.json(
      { error: clash ? `Staff ID "${staffId}" is already taken` : error.message },
      { status: clash ? 409 : 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}
