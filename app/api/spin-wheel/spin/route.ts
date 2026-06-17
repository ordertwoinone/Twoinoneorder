export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Seg {
  id: string;
  label: string;
  code: string;
  weight: number;
  is_winning: boolean;
  is_active: boolean;
  usage_limit: number;
  times_won: number;
}

function pickIndex(pool: Seg[]): number {
  const total = pool.reduce((sum, s) => sum + Math.max(0, s.weight), 0);
  if (total <= 0) return Math.floor(Math.random() * pool.length);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= Math.max(0, pool[i].weight);
    if (r < 0) return i;
  }
  return pool.length - 1;
}

const available = (s: Seg) =>
  s.is_active && s.weight > 0 && (s.usage_limit === 0 || s.times_won < s.usage_limit);

// Authoritative spin: picks a non-depleted slice, atomically claims the win,
// and records the entry. The client only animates to the returned winner.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = (body.email ?? "").trim().toLowerCase();
  const hasEmail = EMAIL_RE.test(email);

  const { data: settings } = await supabaseAdmin
    .from("spin_wheel_settings")
    .select("is_enabled")
    .single();
  if (!settings?.is_enabled) {
    return NextResponse.json({ error: "Wheel is not active" }, { status: 400 });
  }

  // One prize per email — if they already played, return their existing prize.
  if (hasEmail) {
    const { data: existing } = await supabaseAdmin
      .from("spin_wheel_entries")
      .select("prize_label, prize_code, is_winning")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1);
    if (existing && existing.length > 0) {
      const e = existing[0];
      return NextResponse.json({
        alreadyPlayed: true,
        winner: { label: e.prize_label, code: e.prize_code, is_winning: e.is_winning },
      });
    }
  }

  const { data: rows } = await supabaseAdmin
    .from("spin_wheel_segments")
    .select("*")
    .order("sort_order", { ascending: true });

  let pool = (rows as Seg[] | null ?? []).filter(available);

  // Pick + atomically claim, retrying if another spin claimed the last one first.
  let winner: Seg | null = null;
  while (pool.length > 0) {
    const candidate = pool[pickIndex(pool)];

    // No claim needed for "no win" slices or unlimited prizes.
    if (!candidate.is_winning || candidate.usage_limit === 0) {
      if (candidate.is_winning) {
        await supabaseAdmin
          .from("spin_wheel_segments")
          .update({ times_won: candidate.times_won + 1, updated_at: new Date().toISOString() })
          .eq("id", candidate.id);
      }
      winner = candidate;
      break;
    }

    // Limited prize: optimistic compare-and-set on times_won.
    const { data: claimed } = await supabaseAdmin
      .from("spin_wheel_segments")
      .update({ times_won: candidate.times_won + 1, updated_at: new Date().toISOString() })
      .eq("id", candidate.id)
      .eq("times_won", candidate.times_won)
      .select()
      .single();

    if (claimed) {
      winner = candidate;
      break;
    }

    // Lost the race — drop it, refetch its current state, retry if still available.
    pool = pool.filter((s) => s.id !== candidate.id);
    const { data: fresh } = await supabaseAdmin
      .from("spin_wheel_segments")
      .select("*")
      .eq("id", candidate.id)
      .single();
    if (fresh && available(fresh as Seg)) pool.push(fresh as Seg);
  }

  if (!winner) {
    return NextResponse.json({ error: "No prizes are available right now." }, { status: 409 });
  }

  // Record the entry (email mode only).
  if (hasEmail) {
    await supabaseAdmin.from("spin_wheel_entries").insert([
      {
        email,
        prize_label: winner.label,
        prize_code: winner.code,
        is_winning: !!(winner.is_winning && winner.code),
      },
    ]);
  }

  return NextResponse.json({
    winner: {
      id: winner.id,
      label: winner.label,
      code: winner.code,
      is_winning: winner.is_winning,
    },
  });
}
