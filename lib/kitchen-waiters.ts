import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { hashPin, pinMatches } from "@/lib/pos/auth";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/**
 * Waiter PINs for the /kitchens page.
 *
 * Hashed the same way as till PINs, but typed with no staff ID, so a PIN has to
 * be unique and finding the waiter means checking it against each one. That is
 * affordable for a restaurant's worth of staff.
 */

/** Wrong PINs from one network address before it stops being answered. A whole
    restaurant can share an address, so this is looser than the till's limit. */
const MAX_ATTEMPTS = 10;
const LOCK_MINUTES = 10;

export const isWaiterPin = (pin: unknown): pin is string =>
  typeof pin === "string" && /^\d{4}$/.test(pin);

interface WaiterSecret {
  id: string;
  name: string;
  pin_hash: string;
  pin_salt: string;
  is_active: boolean;
}

async function matchPin(pin: string, waiters: WaiterSecret[]): Promise<WaiterSecret | null> {
  const results = await Promise.all(waiters.map((w) => pinMatches(pin, w.pin_hash, w.pin_salt)));
  return waiters[results.indexOf(true)] ?? null;
}

async function allWaiters(): Promise<{ waiters: WaiterSecret[]; error: string | null }> {
  const { data, error } = await supabaseAdminLive
    .from("kitchen_waiters")
    .select("id, name, pin_hash, pin_salt, is_active");
  return { waiters: (data ?? []) as WaiterSecret[], error: error?.message ?? null };
}

/** Hash and salt for a new PIN, or why it cannot be used. */
export async function preparePin(
  pin: string,
  exceptId?: string,
): Promise<{ hash: string; salt: string } | { error: string; status: number }> {
  const { waiters, error } = await allWaiters();
  if (error) return { error, status: 500 };
  // Includes inactive waiters, who could otherwise clash the day they return.
  const clash = await matchPin(pin, waiters.filter((w) => w.id !== exceptId));
  if (clash) return { error: "Another waiter already uses that PIN. Choose a different one.", status: 409 };
  return hashPin(pin);
}

/** How long a PIN stays good for on a device: about one working day. */
const TOKEN_HOURS = 16;

const tokenSignature = (payload: string) =>
  createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").update(`kitchen-waiter:${payload}`).digest("hex");

/* Handed to the page once a PIN checks out, so orders can name the waiter
   without the PIN being kept in the browser or a name being taken on trust. */
function waiterToken(id: string): string {
  const payload = `${id}.${Date.now() + TOKEN_HOURS * 3600_000}`;
  return `${payload}.${tokenSignature(payload)}`;
}

/** The waiter behind a token, if it is genuine, unexpired and they are still active. */
export async function waiterFromToken(token: unknown): Promise<{ id: string; name: string } | null> {
  if (typeof token !== "string") return null;
  const [id, expires, signature] = token.split(".");
  if (!id || !expires || !signature || Number(expires) < Date.now()) return null;

  const expected = Buffer.from(tokenSignature(`${id}.${expires}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  const { data } = await supabaseAdminLive
    .from("kitchen_waiters")
    .select("id, name, is_active")
    .eq("id", id)
    .maybeSingle();
  return data?.is_active ? { id: data.id, name: data.name } : null;
}

export type PinResult =
  | { status: "ok"; id: string; name: string; token: string }
  | { status: "wrong" | "locked" | "unavailable" };

/** Checks a PIN typed on the public page, counting failures against the address. */
export async function verifyWaiterPin(pin: string, ip: string): Promise<PinResult> {
  const ipHash = createHash("sha256").update(ip).digest("hex");

  const { data: attempt, error: attemptError } = await supabaseAdminLive
    .from("kitchen_waiter_pin_attempts")
    .select("failed_attempts, locked_until, updated_at")
    .eq("ip_hash", ipHash)
    .maybeSingle();
  // Without the counter there is no limit on guesses, so nothing is checked.
  if (attemptError) return { status: "unavailable" };

  const now = Date.now();
  if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > now) {
    return { status: "locked" };
  }

  const { waiters, error } = await allWaiters();
  if (error) return { status: "unavailable" };

  const match = await matchPin(pin, waiters.filter((w) => w.is_active));

  if (match) {
    if (attempt) {
      await supabaseAdminLive.from("kitchen_waiter_pin_attempts").delete().eq("ip_hash", ipHash);
    }
    return { status: "ok", id: match.id, name: match.name, token: waiterToken(match.id) };
  }

  // A count left over from before the last lock, or long ago, starts again.
  const stale =
    !attempt?.updated_at ||
    attempt.locked_until !== null ||
    now - new Date(attempt.updated_at).getTime() > LOCK_MINUTES * 60_000;
  const failed = (stale ? 0 : attempt.failed_attempts) + 1;

  const { error: writeError } = await supabaseAdminLive.from("kitchen_waiter_pin_attempts").upsert({
    ip_hash: ipHash,
    failed_attempts: failed,
    locked_until: failed >= MAX_ATTEMPTS ? new Date(now + LOCK_MINUTES * 60_000).toISOString() : null,
    updated_at: new Date(now).toISOString(),
  });
  if (writeError) return { status: "unavailable" };

  return { status: failed >= MAX_ATTEMPTS ? "locked" : "wrong" };
}

const PIN_MESSAGES: Record<string, string> = {
  wrong: "That PIN isn't right.",
  locked: "Too many wrong PINs. Wait 10 minutes and try again.",
  unavailable: "PINs can't be checked right now. Run supabase/kitchen_waiters.sql, or try again.",
};

/**
 * Whether a typed PIN may change this order: it has to be the PIN of the
 * waiter who took it. An order taken with no waiter can be changed by any
 * waiter. Wrong PINs count towards the same lock as the public page.
 */
export async function checkOrderPin(
  request: Request,
  order: { waiter_id?: string | null; waiter_name?: string | null },
  pin: unknown,
): Promise<{ error: string; status: number } | null> {
  if (!isWaiterPin(pin)) return { error: "Type the 4-digit waiter PIN.", status: 401 };

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const result = await verifyWaiterPin(pin, ip);
  if (result.status !== "ok") {
    return { error: PIN_MESSAGES[result.status], status: result.status === "locked" ? 429 : result.status === "unavailable" ? 503 : 401 };
  }
  if (order.waiter_id && order.waiter_id !== result.id) {
    return { error: `This is ${order.waiter_name ?? "another waiter"}'s order. Only their PIN can change it.`, status: 403 };
  }
  return null;
}
