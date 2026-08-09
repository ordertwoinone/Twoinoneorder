/**
 * The times a customer may choose to collect an order.
 *
 * Nothing is offered sooner than the lead time the branch sets in admin →
 * University Kalba → Branch Info: a kitchen that needs half an hour should
 * never be handed a ticket asking for food in five minutes. Because the list
 * only contains valid times, there is no invalid choice to reject afterwards.
 */

export const SLOT_STEP_MINUTES = 15;

/** How far ahead the picker lets someone book — six hours at 15-minute steps. */
export const SLOT_COUNT = 24;

export function pickupSlots(
  leadMinutes: number,
  now: Date = new Date(),
  count: number = SLOT_COUNT,
  stepMinutes: number = SLOT_STEP_MINUTES,
): Date[] {
  const step = stepMinutes * 60_000;
  const earliest = now.getTime() + Math.max(0, leadMinutes) * 60_000;
  // Rounded up to the next step, so slots read as clock times rather than 14:37.
  const first = Math.ceil(earliest / step) * step;
  return Array.from({ length: count }, (_, i) => new Date(first + i * step));
}

/** "14:45" — what the bookings row stores, and what admin screens parse. */
export function slotTimeValue(at: Date): string {
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
}

/** "2026-08-08" in local time; toISOString would shift the date across UTC. */
export function slotDateValue(at: Date): string {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
}

/** Whether a slot falls on a later day than now — the picker says so. */
export function isNextDay(at: Date, now: Date = new Date()): boolean {
  return slotDateValue(at) !== slotDateValue(now);
}
