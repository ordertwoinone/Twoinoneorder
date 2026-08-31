/**
 * A shift: the drawer counted open, the drawer counted shut, and everything
 * rung up in between.
 *
 * Nothing here totals the takings — those come from the orders themselves at
 * day-close time. A running total kept on the shift row is a number nobody can
 * audit, and the first thing anyone would query is the orders anyway.
 *
 * Pure arithmetic only, so the till screens can import it. Anything that reads
 * the database lives in shift-server.ts — the same split as lib/kalba/addons,
 * and for the same reason: one import of the service-role client from a client
 * component and the whole page dies with "supabaseKey is required".
 */

/** The notes and coins a UAE drawer is counted in. */
export const DENOMINATIONS = [5, 10, 20, 50, 100, 200, 500, 1000] as const;

/** { "50": 2, "100": 3 } → 400. Anything unrecognised is ignored. */
export function countTotal(counts: Record<string, number> | null | undefined): number {
  if (!counts) return 0;
  let total = 0;
  for (const note of DENOMINATIONS) {
    const n = Math.max(0, Math.floor(Number(counts[String(note)]) || 0));
    total += note * n;
  }
  return Math.round(total * 100) / 100;
}

/** Only the denominations we know, only whole non-negative counts. */
export function cleanCounts(input: unknown): Record<string, number> {
  const raw = (input ?? {}) as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const note of DENOMINATIONS) {
    const n = Math.max(0, Math.floor(Number(raw[String(note)]) || 0));
    if (n > 0) out[String(note)] = n;
  }
  return out;
}

/** Which shift this is, by the clock. Stored, so a rota change cannot rewrite it. */
export function shiftLabel(at = new Date()): string {
  const hour = at.getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export interface PosShift {
  id: string;
  staff_uuid: string;
  status: "open" | "closed";
  shift_label: string;
  opened_at: string;
  closed_at: string | null;
  opening_float: number | string;
  opening_counts: Record<string, number>;
  opening_note: string;
}

/**
 * A shift left open from a previous day.
 *
 * Declared here rather than beside the query that finds them, because the
 * warning banner is a client component and importing a type out of a module
 * that holds the service-role key is one careless edit away from shipping it
 * to the browser.
 */
export interface StaleShift {
  id: string;
  staff_name: string;
  shift_label: string;
  opened_at: string;
  /** Whole days between it opening and now. 1 is "yesterday's". */
  days_old: number;
}
