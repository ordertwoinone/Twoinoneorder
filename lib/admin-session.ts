import { createClient } from "@/lib/supabase/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/** The signed-in member, as an API route needs to know them. */
export interface AdminMember {
  userId: string;
  email: string;
  name: string;
  areas: string[];
  isOwner: boolean;
}

/**
 * Who is calling an admin API.
 *
 * Middleware has already turned away anyone who is not a member, but a route
 * that grants access — /api/admin/team — must not take that on trust: it reads
 * the membership again, through the service role, so its own answer does not
 * depend on the caller's RLS view.
 */
export async function currentMember(): Promise<AdminMember | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabaseAdminLive
    .from("admin_users")
    .select("email, name, areas, is_owner, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  const row = data as {
    email: string; name: string; areas: string[] | null;
    is_owner: boolean; is_active: boolean;
  } | null;

  if (!row || !row.is_active) return null;

  return {
    userId: user.id,
    email: row.email,
    name: row.name ?? "",
    areas: row.areas ?? [],
    isOwner: row.is_owner,
  };
}
