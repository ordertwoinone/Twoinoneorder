import { supabaseAdminLive } from "@/lib/supabase-admin";
import UsersTable, { type AdminUser } from "./UsersTable";

export const dynamic = "force-dynamic";

/**
 * Signed-up customers, read straight from Supabase Auth.
 *
 * Deliberately a server component with no /api/admin route behind it: this is
 * the only screen that hands out customer email addresses, and middleware.ts
 * guards /admin pages but not /api paths.
 */
async function getUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabaseAdminLive.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error || !data?.users) return [];

  // Bookings and favourites tell you which sign-ups actually became customers.
  const [bookings, favorites] = await Promise.all([
    supabaseAdminLive.from("bookings").select("user_id"),
    supabaseAdminLive.from("favorites").select("user_id"),
  ]);

  const tally = (rows: { user_id: string | null }[] | null) => {
    const counts: Record<string, number> = {};
    (rows ?? []).forEach((r) => {
      if (r.user_id) counts[r.user_id] = (counts[r.user_id] ?? 0) + 1;
    });
    return counts;
  };

  const bookingCounts = tally(bookings.data as { user_id: string | null }[] | null);
  const favoriteCounts = tally(favorites.data as { user_id: string | null }[] | null);

  return data.users.map((u) => {
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const str = (key: string) => (typeof meta[key] === "string" ? (meta[key] as string) : "");

    return {
      id: u.id,
      email: u.email ?? "",
      name: str("full_name") || str("name"),
      avatarUrl: str("avatar_url") || str("picture"),
      // Google, email, … — whichever identity they signed up with.
      provider: u.app_metadata?.provider ?? "email",
      createdAt: u.created_at ?? "",
      lastSignInAt: u.last_sign_in_at ?? "",
      emailConfirmed: Boolean(u.email_confirmed_at),
      bookings: bookingCounts[u.id] ?? 0,
      favorites: favoriteCounts[u.id] ?? 0,
    };
  });
}

export default async function UsersAdmin() {
  const users = await getUsers();
  return <UsersTable users={users} />;
}
