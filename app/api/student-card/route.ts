export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import {
  STUDENT_DISCOUNT_PERCENT,
  generateCardNumber,
  generateMemberId,
  isUniversityCode,
  validThruDate,
} from "@/lib/student-card";

const CARD_FIELDS =
  "id, full_name, university, academic_year, member_id, card_number, discount_percent, valid_thru, status, created_at";

/* Postgres' unique_violation. Two students issued in the same instant can draw
   the same number; that is what the retry below is for. */
const UNIQUE_VIOLATION = "23505";
const ISSUE_ATTEMPTS = 5;

/** The card belonging to the signed-in student, or null if they have none. */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ card: null });

  /* supabaseAdminLive, not supabaseAdmin: a card issued seconds ago must not
     read back as "no card" from Next's data cache. */
  const { data, error } = await supabaseAdminLive
    .from("student_cards")
    .select(CARD_FIELDS)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ card: data ?? null });
}

/**
 * Issues a card to the signed-in student.
 *
 * The number is minted here rather than in the browser: it has to be unique
 * across every student, and only the service role can see enough of the table
 * to guarantee that.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to get your card." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const fullName = String(body?.full_name ?? "").trim();
  const university = body?.university;
  const academicYear = String(body?.academic_year ?? "").trim();
  const dateOfBirth = String(body?.date_of_birth ?? "").trim();

  if (
    fullName.length < 2 ||
    !isUniversityCode(university) ||
    academicYear === "" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
    Number.isNaN(new Date(dateOfBirth).getTime())
  ) {
    return NextResponse.json({ error: "Please fill in every field." }, { status: 400 });
  }

  /* One card per student. Asking again — a second tab, a re-submitted draft —
     hands back the card they already have instead of minting a second one. */
  const { data: existing } = await supabaseAdminLive
    .from("student_cards")
    .select(CARD_FIELDS)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ card: existing });

  const row = {
    user_id: user.id,
    full_name: fullName.slice(0, 80),
    university,
    academic_year: academicYear.slice(0, 24),
    date_of_birth: dateOfBirth,
    discount_percent: STUDENT_DISCOUNT_PERCENT,
    valid_thru: validThruDate(),
  };

  for (let attempt = 0; attempt < ISSUE_ATTEMPTS; attempt++) {
    const { data, error } = await supabaseAdminLive
      .from("student_cards")
      .insert({ ...row, member_id: generateMemberId(), card_number: generateCardNumber() })
      .select(CARD_FIELDS)
      .single();

    if (!error) return NextResponse.json({ card: data });

    if (error.code !== UNIQUE_VIOLATION) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    /* A clash on user_id means another request issued their card while this one
       was in flight — return that card rather than trying for a new number. */
    if (error.message.includes("user_id")) {
      const { data: raced } = await supabaseAdminLive
        .from("student_cards")
        .select(CARD_FIELDS)
        .eq("user_id", user.id)
        .maybeSingle();
      if (raced) return NextResponse.json({ card: raced });
    }
  }

  return NextResponse.json(
    { error: "We couldn't issue your card. Please try again." },
    { status: 503 },
  );
}
