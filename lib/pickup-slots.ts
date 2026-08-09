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

/**
 * The moment the branch shuts, as a Date on the day `now` falls in.
 *
 * `closes_at` is a display string an admin types — "12:00 AM", "11:30 PM",
 * "23:00" — so this is deliberately forgiving, and returns null on anything it
 * cannot read rather than guessing a closing time and hiding real slots.
 *
 * A closing hour before 6am belongs to the following morning: a kitchen that
 * shuts at 12:00 AM is open all of this evening, not none of it.
 */
export function parseClosingTime(closesAt: string | null | undefined, now: Date): Date | null {
  const text = (closesAt ?? "").trim();
  if (!text) return null;

  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(text);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.toLowerCase();

  if (hours > 23 || minutes > 59) return null;
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  const close = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  // Closing in the small hours means tomorrow's small hours.
  if (hours < 6) close.setDate(close.getDate() + 1);
  return close;
}

/**
 * Today's slots only, and never past closing.
 *
 * A branch takes collections while it is open today; offering tomorrow morning
 * from tonight's cart means a ticket nobody is on shift to see. Late enough in
 * the evening this returns nothing, which the cart says plainly rather than
 * pretending there is a slot.
 */
export function pickupSlots(
  leadMinutes: number,
  now: Date = new Date(),
  closesAt?: string | null,
  count: number = SLOT_COUNT,
  stepMinutes: number = SLOT_STEP_MINUTES,
): Date[] {
  const step = stepMinutes * 60_000;
  const earliest = now.getTime() + Math.max(0, leadMinutes) * 60_000;
  // Rounded up to the next step, so slots read as clock times rather than 14:37.
  const first = Math.ceil(earliest / step) * step;

  const today = slotDateValue(now);
  const closing = parseClosingTime(closesAt, now);

  const slots: Date[] = [];
  for (let i = 0; i < count; i++) {
    const at = new Date(first + i * step);
    if (slotDateValue(at) !== today) break;
    // Collecting exactly at closing is fine; a minute later is not.
    if (closing && at.getTime() > closing.getTime()) break;
    slots.push(at);
  }
  return slots;
}

/** "3:15 PM" — the 12-hour clock, whatever the device is set to. */
export function slotLabel(at: Date): string {
  return at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

/** "14:45" — what the bookings row stores, and what admin screens parse. */
export function slotTimeValue(at: Date): string {
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
}

/** "2026-08-08" in local time; toISOString would shift the date across UTC. */
export function slotDateValue(at: Date): string {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
}
