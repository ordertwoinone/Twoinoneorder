export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Checks whether an email has already played (one prize per email).
export async function GET(request: Request) {
  const email = (new URL(request.url).searchParams.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("spin_wheel_entries")
    .select("email, prize_label, prize_code, is_winning, created_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const entry = data?.[0] ?? null;
  return NextResponse.json({ exists: !!entry, entry });
}

// Records a visitor's email + the prize they spun. Called by the public widget.
export async function POST(request: Request) {
  const body = await request.json();
  const email = (body.email ?? "").trim().toLowerCase();

  // Only store entries that captured an email.
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // One prize per email — don't insert a duplicate.
  const { data: existing } = await supabaseAdmin
    .from("spin_wheel_entries")
    .select("id")
    .eq("email", email)
    .limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ success: true, duplicate: true });
  }

  const { error } = await supabaseAdmin.from("spin_wheel_entries").insert([
    {
      email,
      prize_label: (body.prize_label ?? "").toString().slice(0, 120),
      prize_code: (body.prize_code ?? "").toString().toUpperCase().slice(0, 60),
      is_winning: !!body.is_winning,
    },
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
