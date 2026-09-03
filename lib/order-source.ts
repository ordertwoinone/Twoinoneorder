/**
 * Where an order came from.
 *
 * The branch now takes orders three ways — a customer at a standing kiosk, a
 * cashier at the till, and the website — and by the time a ticket reaches the
 * kitchen or a receipt reaches a customer's hand, nothing on the paper said
 * which. That matters in both directions: the kitchen works a website order
 * differently from one whose customer is standing at the counter, and a cashier
 * chasing a query needs to know whether to look at a panel, a shift, or the
 * site.
 *
 * A booking row already carries the answer, spread across three columns. This
 * is the one place that reads them, so the board, the 80mm receipt and the A4
 * invoice cannot end up disagreeing about the same order.
 */

/** The three ways an order reaches the branch. */
export type OrderChannel = "Kiosk" | "Counter" | "Website";

export interface OrderSource {
  channel: OrderChannel;
  /**
   * The full answer: "Kiosk · UNIVERCITY TAB 1", "Counter · THOMAS", "Website".
   * This is what prints on an invoice.
   */
  label: string;
  /** The prefix that order's number is issued under — POS-1124, TIO-1088. */
  prefix: string;
}

/** Booking types that are food orders rather than reservations. */
export const KITCHEN_TYPES = ["pos", "kiosk", "kalba"] as const;

/** What a website order's number reads as; the site issues no prefix of its own. */
const WEBSITE_PREFIX = "WEB";

export interface OrderSourceRow {
  type?: string | null;
  kiosk_device_id?: string | null;
  pos_staff_uuid?: string | null;
}

/** The names behind the two id columns, when they have been looked up. */
export interface OrderSourceNames {
  /** kiosk_devices.label, e.g. "UNIVERCITY TAB 1". */
  device?: string | null;
  /** pos_staff.name, e.g. "THOMAS". */
  staff?: string | null;
}

/**
 * A booking row read as a source.
 *
 * The names are optional throughout. Most kiosk orders predate named panels and
 * carry no device at all, and a website order has neither — those still have to
 * describe themselves, so an unnamed source degrades to its channel rather than
 * to a blank or a dangling separator.
 */
export function describeOrderSource(
  row: OrderSourceRow,
  names: OrderSourceNames = {},
  prefixes: { pos?: string; kiosk?: string } = {},
): OrderSource {
  const type = String(row.type ?? "").toLowerCase();

  if (type === "kiosk") {
    const device = (names.device ?? "").trim();
    return {
      channel: "Kiosk",
      label: device ? `Kiosk · ${device}` : "Kiosk",
      prefix: (prefixes.kiosk || "TIO").trim().toUpperCase(),
    };
  }

  if (type === "pos") {
    const staff = (names.staff ?? "").trim();
    return {
      channel: "Counter",
      label: staff ? `Counter · ${staff}` : "Counter",
      prefix: (prefixes.pos || "ORD").trim().toUpperCase(),
    };
  }

  /* Everything else reached us over the site: the Kalba storefront, a buffet
     enquiry, a table booking. They differ in what they are for, not in where
     they came from, and the receipt only answers the second. */
  return { channel: "Website", label: "Website", prefix: WEBSITE_PREFIX };
}

/** "POS-1124", or the bare prefix while the number is still being issued. */
export function sourceOrderCode(
  source: OrderSource,
  orderNumber: number | null | undefined,
): string {
  return orderNumber ? `${source.prefix}-${orderNumber}` : source.prefix;
}
