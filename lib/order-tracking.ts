/**
 * The public tracking page Shipday publishes for this account.
 *
 * Kept here rather than typed into the screen so a rename of the account slug
 * is one edit. The page is a client-rendered app that reads the tracking id
 * out of its own URL path, so the id goes on the end and nothing else.
 */
export const TRACKING_BASE_URL = "https://www.ordertracking.io/Twoinoneorder/delivery";

/**
 * A tracking id out of whatever was pasted.
 *
 * Staff paste the whole tracking link as often as the id — it is what Shipday
 * hands them — so the last path segment is taken and any query string dropped
 * rather than sending the URL back through the URL.
 */
export function trackingIdFrom(input: string): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";

  const withoutQuery = trimmed.split(/[?#]/)[0];
  const segments = withoutQuery.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";

  // A bare id has no slashes; a pasted link ends in the id.
  return last.trim();
}

/** Where to send the browser for one delivery. */
export function trackingUrl(input: string): string {
  const id = trackingIdFrom(input);
  return id ? `${TRACKING_BASE_URL}/${encodeURIComponent(id)}` : "";
}
