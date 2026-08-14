/**
 * A dish's own offer — a straight percentage off, set per item in admin.
 *
 * It comes off the dish's price before any chosen options are added: "10% off
 * the burger" should not quietly discount the extra cheese as well. Coupons and
 * the Student Privilege Card then apply to the discounted basket, so the three
 * stack in the shopper's favour rather than competing.
 */

/**
 * To the fil, killing the binary-float residue.
 *
 * 24 − 19.44 is 4.559999999999999 in IEEE 754, and a cart happily printed that.
 * Every figure the shopper reads goes through here, so a total, a saving and a
 * line price can never disagree in the fifteenth decimal place.
 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Postgres numeric comes back as a string often enough to matter. */
export function toPercent(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(n)) return 0;
  // Anything outside 0–100 is a typo, not an instruction.
  return Math.min(100, Math.max(0, n));
}

/** Rounded to fils, so what is shown and what is charged never disagree. */
export function discountedPrice(base: number, percent: number | string | null): number {
  const pct = toPercent(percent);
  if (pct <= 0) return base;
  return roundMoney((base * (100 - pct)) / 100);
}

/** What the offer takes off one of this dish. */
export function itemSaving(base: number, percent: number | string | null): number {
  return roundMoney(base - discountedPrice(base, percent));
}
