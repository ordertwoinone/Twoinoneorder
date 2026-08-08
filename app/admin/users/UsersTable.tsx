"use client";
import { useMemo, useState } from "react";
import { Search, UserRound } from "lucide-react";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  provider: string;
  createdAt: string;
  lastSignInAt: string;
  emailConfirmed: boolean;
  bookings: number;
  favorites: number;
}

const PROVIDER_CHIPS: Record<string, string> = {
  google: "bg-blue-50 text-blue-700",
  email: "bg-gray-100 text-gray-600",
};

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/** "3 days ago" reads faster than a date when you are scanning for activity. */
function timeAgo(iso: string) {
  if (!iso) return "Never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export default function UsersTable({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? users.filter((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
      : users;
    // Newest sign-up first — the same order every other admin list uses.
    return [...matched].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [users, query]);

  const withBookings = users.filter((u) => u.bookings > 0).length;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Customers</p>
          <h1 className="text-2xl font-semibold text-gray-900">Signed-up Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {users.length} account{users.length !== 1 ? "s" : ""} · {withBookings} with a booking
          </p>
        </div>

        <div className="relative">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="w-full sm:w-72 ps-9 pe-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Signed up with</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last seen</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bookings</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Favourites</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                  {users.length === 0 ? "Nobody has signed up yet." : "No user matches that search."}
                </td>
              </tr>
            ) : shown.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {u.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={u.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                        <UserRound size={16} />
                      </span>
                    )}
                    <span className="font-semibold text-gray-800">{u.name || "—"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <span className="flex items-center gap-2">
                    {u.email || "—"}
                    {u.email && !u.emailConfirmed && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Unverified</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PROVIDER_CHIPS[u.provider] ?? "bg-gray-100 text-gray-600"}`}>
                    {u.provider}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{timeAgo(u.lastSignInAt)}</td>
                <td className="px-4 py-3 text-xs font-semibold text-gray-700">{u.bookings}</td>
                <td className="px-4 py-3 text-xs font-semibold text-gray-700">{u.favorites}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
