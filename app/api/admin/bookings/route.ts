export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/**
 * Bookings, each carrying the account that placed it.
 *
 * A booking stores the name and phone the guest typed, which need not be the
 * account they were signed in as — and a booking made signed-out has no account
 * at all. So the account is looked up from user_id and attached separately
 * rather than overwriting the typed details.
 */
export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const bookings = (data ?? []) as { user_id?: string | null; pos_staff_uuid?: string | null }[];

  /* Who rang it up, for the orders that came from a till or a kiosk.
     Read as a second query rather than an embed: pos_staff_uuid arrives with a
     hand-run migration, and PostgREST answers the whole select with a 400 on an
     embed it cannot resolve — which would empty the admin board rather than
     leave one column blank. */
  const staffIds = Array.from(
    new Set(bookings.map((b) => b.pos_staff_uuid).filter(Boolean) as string[]),
  );
  const staffNames = new Map<string, string>();
  if (staffIds.length > 0) {
    const { data: rows } = await supabaseAdminLive
      .from("pos_staff")
      .select("id, name, staff_id")
      .in("id", staffIds);
    for (const raw of (rows ?? []) as { id: string; name: string; staff_id: string }[]) {
      staffNames.set(raw.id, raw.name || raw.staff_id);
    }
  }

  const withStaff = bookings.map((b) => ({
    ...b,
    staff_name: b.pos_staff_uuid ? staffNames.get(b.pos_staff_uuid) ?? "" : "",
  }));

  const userIds = new Set(bookings.map((b) => b.user_id).filter(Boolean) as string[]);
  if (userIds.size === 0) return NextResponse.json(withStaff);

  const { data: list } = await supabaseAdminLive.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const accounts = new Map<string, { name: string; email: string; avatarUrl: string }>();
  (list?.users ?? []).forEach((u) => {
    if (!userIds.has(u.id)) return;
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const str = (key: string) => (typeof meta[key] === "string" ? (meta[key] as string) : "");
    accounts.set(u.id, {
      name: str("full_name") || str("name"),
      email: u.email ?? "",
      avatarUrl: str("avatar_url") || str("picture"),
    });
  });

  return NextResponse.json(
    withStaff.map((b) => ({ ...b, account: b.user_id ? accounts.get(b.user_id) ?? null : null })),
  );
}
