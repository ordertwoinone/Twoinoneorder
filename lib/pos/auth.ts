import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { isValidPin, type PosStaff } from "@/lib/pos/constants";

/**
 * Signing in at the till.
 *
 * A staff ID and a PIN, typed on a shared tablet. That shape is chosen for the
 * room it lives in — a queue waiting, three people sharing one terminal across
 * a shift — and it is weaker than a password by construction, so the strength
 * has to come from everything around it: PINs are hashed and never stored,
 * guesses are counted and then refused, and a session is a row that can be
 * ended from the outside rather than a token that is valid until it expires.
 */

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export const POS_COOKIE = "tio_pos_session";

export { PIN_MIN, PIN_MAX, isValidPin, type PosRole, type PosStaff } from "@/lib/pos/constants";

/** A shift is a working day, not a week. Long enough to cover a double. */
const SESSION_HOURS = 16;

/** Wrong PINs before the account stops answering, and for how long. */
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 10;

/* ─── PINs ────────────────────────────────────────────────────────────────── */

/** A fresh salt and hash for a PIN being set. */
export async function hashPin(pin: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(pin, salt, 64);
  return { hash: derived.toString("hex"), salt };
}

/**
 * Compared in constant time.
 *
 * A plain === leaks how much of the hash matched through how long it took,
 * which against a four-digit space is a real shortcut rather than a theoretical
 * one.
 */
export async function pinMatches(pin: string, hash: string, salt: string): Promise<boolean> {
  if (!hash || !salt) return false;
  const derived = await scrypt(pin, salt, 64);
  const stored = Buffer.from(hash, "hex");
  if (stored.length !== derived.length) return false;
  return timingSafeEqual(stored, derived);
}

/* ─── Sessions ────────────────────────────────────────────────────────────── */

/** Only the hash is stored, so a dump of pos_sessions is not a set of logins. */
function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(staffUuid: string, deviceLabel = ""): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_HOURS * 3600_000);

  await supabaseAdminLive.from("pos_sessions").insert([
    {
      token_hash: tokenHash(token),
      staff_uuid: staffUuid,
      device_label: deviceLabel.slice(0, 120),
      expires_at: expires.toISOString(),
    },
  ]);

  return token;
}

export function setSessionCookie(token: string) {
  cookies().set(POS_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // A till runs over http on the local network in plenty of restaurants;
    // forcing Secure there would silently drop the cookie and nobody could
    // sign in at all.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export function clearSessionCookie() {
  cookies().set(POS_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/**
 * Who is signed in on this request, or null.
 *
 * Reads the session row every time rather than trusting anything in the cookie:
 * that is what makes ending a session from the admin panel take effect on the
 * next tap instead of whenever the token happens to expire.
 */
export async function currentStaff(): Promise<PosStaff | null> {
  const token = cookies().get(POS_COOKIE)?.value;
  if (!token) return null;

  const { data, error } = await supabaseAdminLive
    .from("pos_sessions")
    .select("id, expires_at, pos_staff!inner(id, staff_id, name, role, is_active)")
    .eq("token_hash", tokenHash(token))
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as { id: string; expires_at: string; pos_staff: PosStaff };

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabaseAdminLive.from("pos_sessions").delete().eq("id", row.id);
    return null;
  }
  // A member of staff switched off in admin loses the till mid-shift, which is
  // the point of the switch.
  if (!row.pos_staff?.is_active) return null;

  return row.pos_staff;
}

export async function endSession(): Promise<void> {
  const token = cookies().get(POS_COOKIE)?.value;
  if (token) {
    await supabaseAdminLive.from("pos_sessions").delete().eq("token_hash", tokenHash(token));
  }
  clearSessionCookie();
}

/* ─── Signing in ──────────────────────────────────────────────────────────── */

export type LoginResult =
  | { ok: true; staff: PosStaff; token: string }
  | { ok: false; error: string };

export async function login(
  staffId: string,
  pin: string,
  deviceLabel = "",
): Promise<LoginResult> {
  const id = staffId.trim().toLowerCase().slice(0, 40);
  if (!id || !isValidPin(pin)) {
    return { ok: false, error: "Check the staff ID and PIN" };
  }

  const { data } = await supabaseAdminLive
    .from("pos_staff")
    .select("*")
    .eq("staff_id", id)
    .maybeSingle();

  const staff = data as
    | (PosStaff & { pin_hash: string; pin_salt: string; failed_attempts: number; locked_until: string | null })
    | null;

  /* One message for "no such ID" and for "wrong PIN". The login screen faces a
     public room, and saying which was wrong turns it into a list of who works
     here. Still hashes a throwaway on the missing-user path so the two take
     about as long as each other. */
  const refuse = { ok: false as const, error: "That staff ID and PIN do not match" };

  if (!staff) {
    await scrypt(pin, "absent-user-timing-equaliser", 64);
    return refuse;
  }

  if (!staff.is_active) return { ok: false, error: "That account is switched off" };

  if (staff.locked_until && new Date(staff.locked_until).getTime() > Date.now()) {
    const mins = Math.max(1, Math.ceil((new Date(staff.locked_until).getTime() - Date.now()) / 60000));
    return { ok: false, error: `Too many tries. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
  }

  if (!(await pinMatches(pin, staff.pin_hash, staff.pin_salt))) {
    const attempts = (staff.failed_attempts ?? 0) + 1;
    await supabaseAdminLive
      .from("pos_staff")
      .update({
        failed_attempts: attempts,
        locked_until:
          attempts >= MAX_ATTEMPTS
            ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
            : null,
      })
      .eq("id", staff.id);
    return refuse;
  }

  await supabaseAdminLive
    .from("pos_staff")
    .update({ failed_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() })
    .eq("id", staff.id);

  const token = await createSession(staff.id, deviceLabel);

  return {
    ok: true,
    token,
    staff: { id: staff.id, staff_id: staff.staff_id, name: staff.name, role: staff.role, is_active: true },
  };
}
