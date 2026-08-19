/**
 * The public tracking page for a take.app order.
 *
 * The tracking id is the take.app order id — a 25-character cuid we already
 * hold on every row of the orders board — so a delivery can be tracked without
 * anyone copying anything. Confirmed against the live API: an order's `id`
 * resolves at this address.
 *
 * Kept here rather than typed into the screen so a change of storefront domain
 * is one edit. It has moved once already.
 */
export const TRACKING_BASE_URL = "https://menu.twoinoneorder.com/orders";

/** What the tracking path ends with, after the id. */
const TRACKING_SUFFIX = "track";

/**
 * A tracking id out of whatever was pasted.
 *
 * Staff paste the whole tracking link as often as the id, and that link ends
 * in "/track" rather than in the id — so the suffix is dropped before the last
 * segment is taken. A bare id passes through untouched.
 */
export function trackingIdFrom(input: string): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";

  const segments = trimmed
    .replace(/^[a-z]+:\/\//i, "")   // scheme, if it was pasted with one
    .split(/[?#]/)[0]
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  /* A host is not an id. Dropping it by the dot rather than by position is
     what makes a bare domain resolve to nothing instead of to itself. */
  if (segments.length > 0 && segments[0].includes(".")) segments.shift();

  // Drop the trailing "track" so the id is the last thing left.
  while (segments.length > 0 && segments[segments.length - 1].toLowerCase() === TRACKING_SUFFIX) {
    segments.pop();
  }

  const last = segments[segments.length - 1] ?? "";
  // "/orders" on its own is a path, not an order.
  return last.toLowerCase() === "orders" ? "" : last;
}

/** Where to send the browser for one delivery. */
export function trackingUrl(input: string): string {
  const id = trackingIdFrom(input);
  return id ? `${TRACKING_BASE_URL}/${encodeURIComponent(id)}/${TRACKING_SUFFIX}` : "";
}
