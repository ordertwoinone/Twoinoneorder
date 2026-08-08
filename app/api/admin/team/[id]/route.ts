export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentMember } from "@/lib/admin-session";
import { ADMIN_AREAS } from "@/lib/admin-areas";

const VALID_AREAS = new Set(ADMIN_AREAS.map((a) => a.key));

function cleanAreas(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(input.filter((a): a is string => typeof a === "string" && VALID_AREAS.has(a))));
}

async function guard(id: string) {
  const member = await currentMember();
  if (!member?.isOwner) {
    return { target: null, response: NextResponse.json({ error: "Only the owner can manage the team." }, { status: 403 }) };
  }

  const { data } = await supabaseAdminLive
    .from("admin_users")
    .select("id, email, is_owner")
    .eq("id", id)
    .maybeSingle();

  const target = data as { id: string; email: string; is_owner: boolean } | null;
  if (!target) {
    return { target: null, response: NextResponse.json({ error: "No such member." }, { status: 404 }) };
  }

  /* The owner row is off limits, to itself as much as to anyone: an owner who
     could edit their own areas or delete their own row could lock every last
     person out of the panel, with no way back in through the UI. */
  if (target.is_owner) {
    return { target: null, response: NextResponse.json({ error: "The owner's access cannot be changed here." }, { status: 400 }) };
  }

  return { target, response: null };
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { target, response } = await guard(params.id);
  if (response || !target) return response;

  const body = await request.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.areas !== undefined) patch.areas = cleanAreas(body.areas);
  if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active);

  const { data, error } = await supabaseAdminLive
    .from("admin_users")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patch as any)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // A password change is a separate concern from the membership row.
  if (typeof body.password === "string" && body.password.length >= 8) {
    const row = data as { user_id: string | null };
    if (row.user_id) await supabaseAdminLive.auth.admin.updateUserById(row.user_id, { password: body.password });
  }

  return NextResponse.json(data);
}

/**
 * Removes admin access. The Supabase account itself is left alone — several of
 * these people are customers too, and deleting the account would take their
 * bookings and favourites with it.
 */
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { response } = await guard(params.id);
  if (response) return response;

  const { error } = await supabaseAdminLive.from("admin_users").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
