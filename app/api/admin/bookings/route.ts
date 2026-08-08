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

  const bookings = (data ?? []) as { user_id?: string | null }[];
  const userIds = new Set(bookings.map((b) => b.user_id).filter(Boolean) as string[]);
  if (userIds.size === 0) return NextResponse.json(bookings);

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
    bookings.map((b) => ({ ...b, account: b.user_id ? accounts.get(b.user_id) ?? null : null })),
  );
}
