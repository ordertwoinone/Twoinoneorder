export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentMember } from "@/lib/admin-session";
import { ADMIN_AREAS } from "@/lib/admin-areas";

const VALID_AREAS = new Set(ADMIN_AREAS.map((a) => a.key));

/** Drops anything that is not a real area key, so a typo cannot grant nothing-ness. */
function cleanAreas(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(input.filter((a): a is string => typeof a === "string" && VALID_AREAS.has(a))));
}

async function requireOwner() {
  const member = await currentMember();
  if (!member?.isOwner) {
    return { member: null, response: NextResponse.json({ error: "Only the owner can manage the team." }, { status: 403 }) };
  }
  return { member, response: null };
}

export async function GET() {
  const { response } = await requireOwner();
  if (response) return response;

  const { data, error } = await supabaseAdminLive
    .from("admin_users")
    .select("*")
    .order("is_owner", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Last sign-in is worth seeing next to a member, and only auth knows it.
  const { data: list } = await supabaseAdminLive.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const lastSeen = new Map((list?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? ""]));

  return NextResponse.json(
    (data ?? []).map((row) => ({ ...row, last_sign_in_at: lastSeen.get(row.user_id) ?? "" })),
  );
}

/**
 * Adds a member.
 *
 * The email may already have a Supabase account — a customer who signed in with
 * Google, or someone added before — in which case that account is granted
 * access rather than a second one being created for the same address.
 */
export async function POST(request: Request) {
  const { response } = await requireOwner();
  if (response) return response;

  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();
  const areas = cleanAreas(body.areas);

  if (!email) return NextResponse.json({ error: "An email address is required." }, { status: 400 });

  const { data: list } = await supabaseAdminLive.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let userId = (list?.users ?? []).find((u) => u.email?.toLowerCase() === email)?.id ?? null;

  if (!userId) {
    if (password.length < 8) {
      return NextResponse.json(
        { error: "This email has no account yet, so it needs a password of at least 8 characters." },
        { status: 400 },
      );
    }
    const { data: created, error: createError } = await supabaseAdminLive.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { full_name: name } : undefined,
    });
    if (createError || !created?.user) {
      return NextResponse.json({ error: createError?.message ?? "Could not create the account." }, { status: 500 });
    }
    userId = created.user.id;
  } else if (password) {
    // An existing account keeps its password unless one was typed here.
    await supabaseAdminLive.auth.admin.updateUserById(userId, { password });
  }

  const { data, error } = await supabaseAdminLive
    .from("admin_users")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert({ user_id: userId, email, name, areas, is_active: true } as any, { onConflict: "email" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
