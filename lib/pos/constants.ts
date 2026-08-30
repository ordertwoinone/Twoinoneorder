/**
 * The handful of facts about till accounts that both sides need to agree on.
 *
 * Split out from lib/pos/auth.ts because that module reaches for node:crypto
 * and next/headers — importing it from the login screen would drag the whole
 * server runtime into a client bundle, and fail the build doing it.
 */

export type PosRole = "cashier" | "manager";

export const PIN_MIN = 4;
export const PIN_MAX = 6;

export interface PosStaff {
  id: string;
  staff_id: string;
  name: string;
  role: PosRole;
  is_active: boolean;
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
};
