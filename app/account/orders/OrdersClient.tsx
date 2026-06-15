"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ShoppingBag, Loader2, LogIn, Armchair, CalendarDays, Clock, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Booking {
  id: string;
  type: string;
  table_id: string;
  table_section: string;
  seats: string;
  guest_name: string;
  date: string;
  time: string;
  guests: number;
  notes: string;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-blue-100 text-blue-700",
};

const TYPE_META: Record<string, { label: string; chip: string }> = {
  table:    { label: "Table Booking", chip: "bg-orange-100 text-orange-700" },
  buffet:   { label: "Buffet Booking", chip: "bg-amber-100 text-amber-700" },
  catering: { label: "Catering",       chip: "bg-purple-100 text-purple-700" },
  kalba:    { label: "Kalba Order",     chip: "bg-green-100 text-green-700" },
};

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export default function OrdersClient() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user ?? null);
      if (data.user) {
        try {
          const res = await fetch("/api/my-bookings");
          const json = await res.json();
          setBookings(json.bookings || []);
        } catch { /* ignore */ }
      }
      setChecking(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/account" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 mb-4 transition-colors">
        <ChevronLeft size={16} /> Back to Account
      </Link>

      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">My Orders &amp; Bookings</h1>
      <p className="text-sm text-gray-500 mb-6">Your table reservations and bookings.</p>

      {checking ? (
        <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-orange-500" size={24} /></div>
      ) : !user ? (
        <Empty
          icon={<LogIn size={26} className="text-orange-400" />}
          title="Sign in to see your bookings"
          sub="Log in to track your reservations and bookings."
          cta={<Link href="/account" className="inline-flex bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors">Sign in</Link>}
        />
      ) : bookings.length === 0 ? (
        <Empty
          icon={<ShoppingBag size={26} className="text-orange-400" />}
          title="No bookings yet"
          sub="Reserve a table — your bookings will appear here."
          cta={
            <div className="flex items-center justify-center gap-2">
              <Link href="/book-table" className="inline-flex bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors">Book a table</Link>
              <Link href="/#restaurants" className="inline-flex border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-bold px-5 py-2.5 rounded-full transition-colors">Browse</Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Armchair size={18} className="text-orange-500" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-extrabold text-gray-900 truncate">
                        {b.table_id ? `Table ${b.table_id}` : (TYPE_META[b.type]?.label ?? "Booking")}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${TYPE_META[b.type]?.chip ?? "bg-gray-100 text-gray-500"}`}>
                        {TYPE_META[b.type]?.label ?? b.type}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {b.status}
                    </span>
                  </div>
                  {b.table_section && <p className="text-[12px] text-gray-400">{b.table_section}{b.seats ? ` · ${b.seats} seats` : ""}</p>}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[12px] text-gray-600">
                    {b.date && <span className="flex items-center gap-1"><CalendarDays size={12} className="text-gray-400" />{fmtDate(b.date)}</span>}
                    {b.time && <span className="flex items-center gap-1"><Clock size={12} className="text-gray-400" />{fmtTime(b.time)}</span>}
                    {b.guests > 0 && <span className="flex items-center gap-1"><Users size={12} className="text-gray-400" />{b.guests} guests</span>}
                  </div>
                  {b.notes && <p className="text-[11px] text-gray-400 mt-1.5 italic">“{b.notes}”</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ icon, title, sub, cta }: { icon: React.ReactNode; title: string; sub: string; cta: React.ReactNode }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-50 flex items-center justify-center">{icon}</div>
      <h2 className="text-lg font-extrabold text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">{sub}</p>
      {cta}
    </div>
  );
}
