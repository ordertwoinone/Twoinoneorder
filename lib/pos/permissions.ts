/**
 * What a member of till staff is allowed to reach.
 *
 * A role says what job someone does; a permission says what they may press.
 * They started as the same thing and could not stay that way: a branch with
 * eight people on the rota has cashiers who count the drawer and cashiers who
 * must never see the reports, and the only way to tell them apart with a role
 * alone was to promote one of them to manager — which also handed over the day
 * close, the void button and everyone's takings.
 *
 * So the role is a starting point. Every account gets its role's defaults until
 * somebody grants or withdraws something on the account itself, and from then
 * on the account's own list is the answer.
 *
 * Client-safe by construction, like lib/pos/constants.ts — the rail imports it
 * to decide what to draw, and the API routes import it to decide what to allow.
 * Drawing is a courtesy; the check at the write is the control.
 */

import type { PosRole } from "@/lib/pos/constants";

export const POS_PERMISSIONS = [
  "till",
  "orders",
  "all_orders",
  "kitchen",
  "availability",
  "expenses",
  "reports",
  "shift_close",
  "day_close",
  "discount_any",
  "void_order",
  "approve_expense",
  "manage_staff",
] as const;

export type PosPermission = (typeof POS_PERMISSIONS)[number];

/** Grouped the way the admin screen lists them: screens first, then powers. */
export const PERMISSION_GROUPS: {
  title: string;
  hint: string;
  keys: PosPermission[];
}[] = [
  {
    title: "Screens",
    hint: "What appears on their rail. A screen they cannot reach is not on it.",
    keys: ["till", "orders", "all_orders", "kitchen", "availability", "expenses", "reports"],
  },
  {
    title: "Closing up",
    hint: "Counting one drawer is not the same as signing off the restaurant's day.",
    keys: ["shift_close", "day_close"],
  },
  {
    title: "Overrides",
    hint: "The four buttons that move money without a sale behind them.",
    keys: ["discount_any", "void_order", "approve_expense", "manage_staff"],
  },
];

export const PERMISSION_LABEL: Record<PosPermission, string> = {
  till: "Take orders",
  orders: "Order board",
  all_orders: "See everyone's orders",
  kitchen: "Kitchen board",
  availability: "Item availability",
  expenses: "Record expenses",
  reports: "Reports",
  shift_close: "Close their own shift",
  day_close: "Close the business day",
  discount_any: "Discount past the cashier limit",
  void_order: "Cancel or refund an order",
  approve_expense: "Approve a large expense",
  manage_staff: "Manage till staff",
};

export const PERMISSION_HINT: Record<PosPermission, string> = {
  till: "Ring up a sale and take payment.",
  orders: "See and advance everything the branch is working on.",
  all_orders: "Without this, the board shows only the orders they took themselves.",
  kitchen: "The cooking board only — no prices, no drawer.",
  availability: "Switch a dish off when it runs out, and back on again.",
  expenses: "Record money paid out of the drawer.",
  reports: "Sales figures across days, not just this shift.",
  shift_close: "Count their drawer and hand it over.",
  day_close: "Sign off every shift's combined figures for the day.",
  discount_any: "Beyond the percentage a cashier is capped at in POS settings.",
  void_order: "A cancellation is a refund the drawer has to answer for.",
  approve_expense: "Anything at or above the threshold in POS settings.",
  manage_staff: "Change what other till accounts are allowed to do.",
};

/**
 * What a role gets when nobody has said otherwise.
 *
 * Cashier is deliberately generous about screens and mute about money: a new
 * starter can sell, work the board, mark the tea as finished and count their
 * own drawer at the end. Everything that can move a figure somebody else has
 * to explain is withheld until it is granted by name.
 */
export const ROLE_DEFAULTS: Record<PosRole, PosPermission[]> = {
  cashier: ["till", "orders", "all_orders", "availability", "expenses", "shift_close"],
  manager: [...POS_PERMISSIONS],
  kitchen: ["kitchen", "all_orders", "availability"],
  /* A waiter takes orders and settles them, and sees their own tickets and no
     one else's — deliberately without "all_orders". A floor of six waiters
     each scrolling past everybody else's tables to find their own is how a
     table gets missed. */
  waiter: ["till", "orders", "availability", "shift_close"],
};

export interface PermissionSubject {
  role: PosRole;
  /** null means "the role's defaults" — see supabase/pos_permissions.sql. */
  permissions?: PosPermission[] | string[] | null;
}

/** The list actually in force for this account. */
export function effectivePermissions(staff: PermissionSubject): PosPermission[] {
  const explicit = staff.permissions;
  if (!Array.isArray(explicit)) return ROLE_DEFAULTS[staff.role] ?? [];
  const granted = new Set((explicit as string[]).map(String));
  // Filtered through the known list rather than trusted as stored, so a key
  // withdrawn from the product stops working the moment it is withdrawn.
  return POS_PERMISSIONS.filter((key) => granted.has(key));
}

export function can(staff: PermissionSubject | null | undefined, key: PosPermission): boolean {
  if (!staff) return false;
  return effectivePermissions(staff).includes(key);
}

/** Only the keys we know, deduplicated, in a stable order — for the writes. */
export function cleanPermissions(input: unknown): PosPermission[] | null {
  if (input === null || input === undefined) return null;
  if (!Array.isArray(input)) return null;
  const given = new Set(input.map((v) => String(v)));
  return POS_PERMISSIONS.filter((key) => given.has(key));
}

/**
 * Where someone lands after signing in.
 *
 * The first screen they are actually allowed to open, rather than a fixed page
 * per role — a cashier with the till withdrawn used to land on a redirect loop
 * between /pos and a page that sent them back.
 */
const LANDING: { key: PosPermission; href: string }[] = [
  { key: "till", href: "/pos/till" },
  { key: "orders", href: "/pos/orders" },
  { key: "kitchen", href: "/pos/kitchen" },
  { key: "availability", href: "/pos/availability" },
  { key: "expenses", href: "/pos/expenses" },
  { key: "reports", href: "/pos/reports" },
  { key: "shift_close", href: "/pos/close" },
  { key: "day_close", href: "/pos/day-close" },
];

export function landingFor(staff: PermissionSubject): string | null {
  const allowed = new Set(effectivePermissions(staff));
  return LANDING.find((entry) => allowed.has(entry.key))?.href ?? null;
}

/** Screens that stand behind an open drawer. Everything else needs only a login. */
export function needsShift(key: PosPermission): boolean {
  return key === "till" || key === "expenses" || key === "shift_close";
}
