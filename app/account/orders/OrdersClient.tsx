"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ShoppingBag, Loader2, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function OrdersClient() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setChecking(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/account" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 mb-4 transition-colors">
        <ChevronLeft size={16} /> Back to Account
      </Link>

      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">My Orders</h1>
      <p className="text-sm text-gray-500 mb-6">Your recent orders & bookings.</p>

      {checking ? (
        <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-orange-500" size={24} /></div>
      ) : !user ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-50 flex items-center justify-center">
            <LogIn size={26} className="text-orange-400" />
          </div>
          <h2 className="text-lg font-extrabold text-gray-900 mb-1">Sign in to see your orders</h2>
          <p className="text-sm text-gray-500 mb-5">Log in to track your orders and bookings.</p>
          <Link href="/account" className="inline-flex bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors">Sign in</Link>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-50 flex items-center justify-center">
            <ShoppingBag size={26} className="text-orange-400" />
          </div>
          <h2 className="text-lg font-extrabold text-gray-900 mb-1">No orders yet</h2>
          <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
            Browse our restaurants and place your first order — it&apos;ll show up here.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link href="/#restaurants" className="inline-flex bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors">Browse restaurants</Link>
            <Link href="/book-table" className="inline-flex border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-bold px-5 py-2.5 rounded-full transition-colors">Book a table</Link>
          </div>
        </div>
      )}
    </div>
  );
}
