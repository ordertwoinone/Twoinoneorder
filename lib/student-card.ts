/**
 * The Student Privilege Card: what a card is, how one is minted, and what it
 * takes off an order.
 *
 * Shared by the issue route, the account screens and both Kalba carts, so the
 * number on the card and the discount at checkout can never drift apart.
 */

/** Every cardholder gets this much off, and the card says so in print. */
export const STUDENT_DISCOUNT_PERCENT = 10;

/** Years a freshly issued card stays valid — the "VALID THRU" on the front. */
export const CARD_VALID_YEARS = 3;

/**
 * The first four digits of every card number. Nothing reads them, but they
 * make our numbers recognisable at a glance and keep the generated space away
 * from anything that could be mistaken for a bank card.
 */
const CARD_PREFIX = "2101";

export interface StudentCard {
  id: string;
  full_name: string;
  university: string;
  academic_year: string;
  member_id: string;
  card_number: string;
  discount_percent: number;
  valid_thru: string;
  status: string;
  created_at: string;
}

/** The universities we serve; the label for each lives in the dictionaries. */
export const UNIVERSITY_CODES = [
  "kalba",
  "sharjah",
  "khorfakkan",
  "aus",
  "other",
] as const;

export type UniversityCode = (typeof UNIVERSITY_CODES)[number];

export function isUniversityCode(value: unknown): value is UniversityCode {
  return UNIVERSITY_CODES.includes(value as UniversityCode);
}

/** Random digits from the platform CSPRNG — the same call works either side. */
function randomDigits(count: number): string {
  const bytes = new Uint8Array(count);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => String(b % 10)).join("");
}

/** Sixteen digits, stored unformatted. Uniqueness is the database's job. */
export function generateCardNumber(): string {
  return CARD_PREFIX + randomDigits(12);
}

/** "KU-25896" — short enough to read out at the counter. */
export function generateMemberId(): string {
  return `KU-${randomDigits(5)}`;
}

/** "2101567890123456" → "2101 5678 9012 3456". */
export function formatCardNumber(cardNumber: string): string {
  return cardNumber.replace(/(.{4})/g, "$1 ").trim();
}

/** The date on the front of the card, as "06/27". */
export function formatValidThru(validThru: string): string {
  const date = new Date(validThru);
  if (Number.isNaN(date.getTime())) return "--/--";
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${month}/${String(date.getUTCFullYear()).slice(-2)}`;
}

/** Three years out, to the end of that month. */
export function validThruDate(from = new Date()): string {
  const year = from.getUTCFullYear() + CARD_VALID_YEARS;
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, from.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

/**
 * The academic years a student can pick, newest first.
 *
 * The year rolls in August, so someone registering in September is offered the
 * year they have just started rather than the one that has ended.
 */
export function academicYearOptions(now = new Date()): string[] {
  const start = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return [0, 1].map((offset) => `${start + offset} – ${start + offset + 1}`);
}

/** True while the card is active and today is on or before VALID THRU. */
export function isCardActive(card: StudentCard | null | undefined): boolean {
  if (!card || card.status !== "active") return false;
  const expires = new Date(card.valid_thru);
  if (Number.isNaN(expires.getTime())) return false;
  return expires.getTime() >= Date.now();
}

/**
 * What the card takes off a subtotal, rounded to fils.
 *
 * Returns 0 for an expired or revoked card, so callers can hand any card
 * straight in without checking it first.
 */
export function studentDiscountAmount(
  card: StudentCard | null | undefined,
  subtotal: number,
): number {
  if (!isCardActive(card) || subtotal <= 0) return 0;
  const percent = card?.discount_percent ?? STUDENT_DISCOUNT_PERCENT;
  return Math.round(((subtotal * percent) / 100) * 100) / 100;
}
