/**
 * The handful of facts about till accounts that both sides need to agree on.
 *
 * Split out from lib/pos/auth.ts because that module reaches for node:crypto
 * and next/headers — importing it from the login screen would drag the whole
 * server runtime into a client bundle, and fail the build doing it.
 */

/**
 * What someone signed in at a screen is here to do.
 *
 * 'kitchen' is not a lesser cashier — it is a different job at a different
 * screen. They never open a drawer, so they are never asked to count one, and
 * nothing that touches money is on their rail at all.
 */
export type PosRole = "cashier" | "manager" | "kitchen";

export const PIN_MIN = 4;
export const PIN_MAX = 6;

export interface PosStaff {
  id: string;
  staff_id: string;
  name: string;
  role: PosRole;
  is_active: boolean;
  /**
   * What this account may actually reach, or null for the role's defaults.
   *
   * See lib/pos/permissions.ts. Kept as plain strings here so this module stays
   * the small shared vocabulary it was — the permission keys are validated
   * where they are read, not where they are carried.
   */
  permissions?: string[] | null;
}

export function isValidPin(pin: string): boolean {
  /* Length checked against the constants, digits checked with a plain literal.
     Built as a template string this read `^\d{4,6}$`, and a template literal
     eats the backslash off \d — leaving `^d{4,6}$`, which matches the letter d
     and no PIN on earth. Nobody could sign in, and the message blamed the PIN. */
  return pin.length >= PIN_MIN && pin.length <= PIN_MAX && /^[0-9]+$/.test(pin);
}

/** How a role reads on screen. */
export const ROLE_LABEL: Record<PosRole, string> = {
  cashier: "Cashier",
  manager: "Manager",
  kitchen: "Kitchen",
};

/** Kitchen staff have no drawer, so no shift, so no day to close. */
export function handlesCash(role: PosRole): boolean {
  return role !== "kitchen";
}

/**
 * Where someone lands after signing in, by role alone.
 *
 * Superseded by landingFor() in lib/pos/permissions.ts, which sends people to
 * the first screen they are actually allowed to open — a cashier with the till
 * withdrawn used to land on it and be bounced straight back. Kept because the
 * kitchen redirect is a plain fact about the job rather than a permission.
 */
export function homeFor(role: PosRole): string {
  return role === "kitchen" ? "/pos/kitchen" : "/pos/till";
}
