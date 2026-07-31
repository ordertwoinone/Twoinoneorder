/**
 * Entrance delay for the nth item in a list, for use with the `.stagger-item`
 * class as an inline `animationDelay`. Capped so a long list still finishes
 * arriving promptly instead of trickling in.
 */
export function stagger(index: number, step = 60, cap = 8) {
  return Math.min(index, cap) * step;
}
