"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Mail, Lock, User as UserIcon, LogOut, Loader2, ShoppingBag,
  Heart, MapPin, ChevronRight, CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export default function AccountClient() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  // form state
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogle() {
    setError("");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/account` },
    });
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
        },
      });
      if (error) setError(error.message);
      else setInfo("Check your inbox to confirm your email, then sign in.");
    }
    setBusy(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  // ── Loading ──────────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={26} className="animate-spin text-orange-500" />
      </div>
    );
  }

  // ── Logged in — account details ──────────────────────────
  if (user) {
    const meta = user.user_metadata || {};
    const displayName = meta.full_name || meta.name || user.email?.split("@")[0] || "Guest";
    const avatar = meta.avatar_url || meta.picture || "";
    const joined = user.created_at
      ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "";

    const rows = [
      { icon: ShoppingBag, label: "My Orders", sub: "Track & reorder", href: "/offers" },
      { icon: Heart, label: "Favourites", sub: "Saved restaurants & dishes", href: "/" },
      { icon: MapPin, label: "Saved Addresses", sub: "Manage delivery locations", href: "/" },
    ];

    return (
      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Profile card */}
        <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="px-6 py-8 flex items-center gap-4" style={{ background: "linear-gradient(120deg,#fff7ed,#ffedd5 55%,#fed7aa)" }}>
            <div className="w-16 h-16 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center shrink-0">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-extrabold text-orange-500">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-900 truncate">{displayName}</h1>
              <p className="text-[13px] text-gray-600 truncate">{user.email}</p>
              {joined && <p className="text-[11px] text-gray-400 mt-0.5">Member since {joined}</p>}
            </div>
          </div>

          {/* Account rows */}
          <div className="bg-white divide-y divide-gray-100">
            {rows.map(({ icon: Icon, label, sub, href }) => (
              <a key={label} href={href} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                <span className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-orange-500" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{label}</p>
                  <p className="text-[12px] text-gray-400">{sub}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </a>
            ))}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    );
  }

  // ── Logged out — login / signup ──────────────────────────
  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <div className="flex justify-center mb-5">
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white shadow-sm flex items-center justify-center">
          <Image src="/logos/two-in-one.png" alt="Two In One" width={44} height={44} className="object-contain" />
        </div>
      </div>

      <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-1">
        {mode === "signin" ? "Welcome back" : "Create account"}
      </h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        {mode === "signin" ? "Sign in to view your account" : "Join Two In One in seconds"}
      </p>

      {/* Google */}
      <button
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <span className="flex-1 h-px bg-gray-100" />
        <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">or</span>
        <span className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Email form */}
      <form onSubmit={handleEmail} className="space-y-3.5">
        {mode === "signup" && (
          <div className="relative">
            <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Full name"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
            />
          </div>
        )}

        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email address"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
          />
        </div>

        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Password"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
          />
        </div>

        {error && <p className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {info && (
          <p className="text-[13px] text-green-700 bg-green-50 px-3 py-2 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" /> {info}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition disabled:opacity-70"
          style={{ background: "#ea580c" }}
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      {/* Toggle */}
      <p className="text-center text-sm text-gray-500 mt-5">
        {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
        <button
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setInfo(""); }}
          className="font-bold text-orange-600 hover:underline"
        >
          {mode === "signin" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
