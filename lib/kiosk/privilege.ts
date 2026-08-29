import { supabaseAdmin } from "@/lib/supabase-admin";
import { isCardActive, type StudentCard } from "@/lib/student-card";

/**
 * Finding a Student Privilege Card from the number typed at the kiosk.
 *
 * One place, used by the lookup the screen calls and again by the order route
 * when it prices what was sent — so the card that was checked and the card that
 * discounts the bill can never be found by two different rules.
 *
 * ── Why the scrubbing below is not optional ──
 * PostgREST's `.or()` takes a filter *expression* as a string, so anything
 * interpolated into it is code, not a value. A code of "1,status.eq.active"
 * would otherwise widen the query to every active card and hand back whichever
 * one came first — someone else's card, and their discount. Only the characters
 * that can appear on a real card survive, which leaves nothing that PostgREST
 * reads as syntax: no dot, comma, bracket or star.
 */

/** What is actually printed on a card: "KU-25896", or sixteen digits. */
const CARD_CODE = /[^A-Za-z0-9-]/g;
const MAX_CODE_LENGTH = 24;

export function cleanCardCode(input: unknown): string {
  return String(input ?? "").replace(/\s+/g, "").replace(CARD_CODE, "").slice(0, MAX_CODE_LENGTH);
}

/**
 * The active card for a typed code, or null.
 *
 * Matched against both things printed on the card — the member id and the long
 * number — because the customer will type whichever one they can read.
 */
export async function findPrivilegeCard(input: unknown): Promise<StudentCard | null> {
  const code = cleanCardCode(input);
  if (!code) return null;

  const { data, error } = await supabaseAdmin
    .from("student_cards")
    .select("*")
    .or(`member_id.eq.${code.toUpperCase()},card_number.eq.${code}`)
    /* Not maybeSingle(): two rows would make that throw, and a lookup that
       errors on an unlucky pair of cards is worse than one that takes the
       first. Both columns are UNIQUE, so a second row cannot be a real match. */
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const card = data[0] as StudentCard;
  return isCardActive(card) ? card : null;
}
