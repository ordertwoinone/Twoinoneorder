"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShieldAlert, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Where a signed-in visitor lands when they are not on the admin team.
 *
 * Customers sign in with Google on the same Supabase project, so someone who
 * has simply typed /admin out of curiosity ends up here — hence the plain
 * explanation and a way back to the site, rather than an error.
 */
export default function NoAccessPage() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/admin";
  }

  return (
    <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-sm flex items-center justify-center">
            <Image src="/logos/two-in-one.png" alt="Two In One" width={52} height={52} className="object-contain" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={22} className="text-orange-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">No admin access</h1>
          <p className="text-sm text-gray-500 mb-1">
            {email ? <>You are signed in as <span className="font-semibold text-gray-700">{email}</span>.</> : "You are signed in."}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            This account is not on the admin team. Ask the owner to add it, or sign in with an account that is.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: "#ea580c" }}
            >
              <LogOut size={15} /> Sign out and use another account
            </button>
            <Link href="/" className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              Back to the site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
