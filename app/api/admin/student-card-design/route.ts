export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { updateRow } from "@/lib/admin-write";
import { getStudentCardDesignLive } from "@/lib/student-card-design-server";
import { DEFAULT_CARD_DESIGN } from "@/lib/student-card-design";

export async function GET() {
  return NextResponse.json(await getStudentCardDesignLive());
}

export async function PUT(request: Request) {
  const body = await request.json();

  /* Only the design's own keys — the form round-trips whatever it was handed,
     and id / created_at are not the caller's to set. */
  const fields: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULT_CARD_DESIGN)) {
    if (key in body) fields[key] = body[key];
  }

  /* The table holds one row. Seeded by the migration, but a database where the
     INSERT was skipped still has to be able to save. */
  const { data: existing } = await supabaseAdminLive
    .from("student_card_design")
    .select("id")
    .limit(1)
    .maybeSingle();

  const id = (existing as { id?: string } | null)?.id;

  const { data, error } = id
    ? await updateRow("student_card_design", id, fields)
    : await supabaseAdminLive.from("student_card_design").insert([fields]).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The card is drawn on the account screens, both of which read this row.
  revalidatePath("/account");
  revalidatePath("/account/student");
  return NextResponse.json(data);
}
