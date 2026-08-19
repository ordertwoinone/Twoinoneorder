/**
 * The public tracking page for a take.app order.
 *
 * Each restaurant has its own storefront subdomain, and an order can only be
 * tracked on the one it was placed at — the same id on the wrong subdomain is a
 * 404. So the store has to be known, not assumed.
 *
 * take.app's own `store.alias` is the key, because it arrives on every order
 * and never changes; the subdomain is what the customer sees and does not
 * resemble the alias at all. The pairing below was confirmed against the live
 * pages: each subdomain's own <title> is that store's name.
 */

const DOMAIN = "twoinoneorder.com";

/** What the tracking path ends with, after the order id. */
const TRACKING_SUFFIX = "track";

export interface TrackingStore {
  /** take.app's alias for the store, as it arrives on an order. */
  alias: string;
  /** How it reads in the admin panel. */
  label: string;
  /** The storefront subdomain the tracking page lives on. */
  host: string;
}

export const TRACKING_STORES: TrackingStore[] = [
  { alias: "twoinone_kalba", label: "Two in One", host: "menu" },
  { alias: "minibox_kalba", label: "Minibox Restaurant", host: "minibox" },
  { alias: "karaksnackae", label: "Karak & Snack", host: "karaksnack" },
  { alias: "falafelalnilekalba", label: "Falafel Al Nile", host: "falafel" },
];

/** The subdomain for a take.app store alias, or "" for one we do not know. */
export function hostForAlias(alias?: string | null): string {
  const key = (alias ?? "").trim().toLowerCase();
  return TRACKING_STORES.find((s) => s.alias.toLowerCase() === key)?.host ?? "";
}

/** The store a subdomain belongs to, for naming what was pasted. */
export function storeForHost(host?: string | null): TrackingStore | null {
  const key = (host ?? "").trim().toLowerCase();
  return TRACKING_STORES.find((s) => s.host === key) ?? null;
}

/** One delivery's tracking page. Both halves are required to reach it. */
export function buildTrackingUrl(orderId: string, host: string): string {
  const id = (orderId ?? "").trim();
  const sub = (host ?? "").trim();
  if (!id || !sub) return "";
  return `https://${sub}.${DOMAIN}/orders/${encodeURIComponent(id)}/${TRACKING_SUFFIX}`;
}

/**
 * The tracking page for an order, given the store it was placed at.
 *
 * Returns nothing for a store not in the list above rather than guessing a
 * subdomain: a link that 404s is worse than no link, because it looks like the
 * delivery is missing rather than the mapping.
 */
export function trackingUrlFor(orderId: string, alias?: string | null): string {
  return buildTrackingUrl(orderId, hostForAlias(alias));
}

export interface ParsedTracking {
  id: string;
  /** The subdomain, when a full link was pasted. */
  host: string;
}

/**
 * An order id and its store out of whatever was pasted.
 *
 * Staff paste the whole tracking link as often as the id, and that link both
 * ends in "/track" rather than the id and names the store in its host — so both
 * halves come out of it and nothing has to be chosen twice.
 */
export function parseTracking(input: string): ParsedTracking {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return { id: "", host: "" };

  const segments = trimmed
    .replace(/^[a-z]+:\/\//i, "")   // scheme, if it was pasted with one
    .split(/[?#]/)[0]
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  let host = "";
  /* A host is not an id. Dropping it by the dot rather than by position is what
     makes a bare domain resolve to nothing instead of to itself. */
  if (segments.length > 0 && segments[0].includes(".")) {
    host = segments.shift()!.split(".")[0].toLowerCase();
  }

  // Drop the trailing "track" so the id is the last thing left.
  while (segments.length > 0 && segments[segments.length - 1].toLowerCase() === TRACKING_SUFFIX) {
    segments.pop();
  }

  const last = segments[segments.length - 1] ?? "";
  // "/orders" on its own is a path, not an order.
  const id = last.toLowerCase() === "orders" ? "" : last;

  return { id, host: storeForHost(host) ? host : "" };
}
