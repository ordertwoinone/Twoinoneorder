import { supabaseAdminLive } from "@/lib/supabase-admin";
import { hostForAlias, TRACKING_STORES } from "@/lib/order-tracking";

/**
 * Website orders, on the same board as everything else.
 *
 * They were absent from the till and the kitchen for a structural reason rather
 * than an oversight: a counter or kiosk order is a row in `bookings`, while
 * anything ordered on one of the four storefronts arrives from take.app and
 * lands in `takeapp_orders`. The board read the first table only, so a website
 * order sat unmade until the customer rang — which is precisely what putting
 * all three sources on one list was supposed to stop.
 *
 * This is the translation layer. A take.app row is turned into the same shape
 * the board already draws for a booking, so nothing downstream — the cards, the
 * kitchen filter, the status chips — has to know there are two tables behind it.
 *
 * Two things do not translate, and are handled rather than papered over:
 *
 *   Status. take.app owns `order_status` and the webhook rewrites it on every
 *   event, so a cook marking a ticket "preparing" would be reset by the next
 *   delivery. The branch's own progress lives in `kitchen_status`, which the
 *   storefront never writes — see supabase/pos_website_orders.sql.
 *
 *   Money. A website order is not on anybody's shift, and the day close counts
 *   by shift. Its total is shown so the kitchen and counter know what the
 *   customer paid, and the till deliberately offers no way to "take payment"
 *   for one: doing that would put cash in the drawer that no reconciliation
 *   could ever account for.
 */

/** take.app sends money in the smallest unit. 1250 is AED 12.50. */
const MINOR_UNITS = 100;

/** Board ids are prefixed so an update can tell which table to write to. */
export const WEBSITE_ID_PREFIX = "web:";

export function isWebsiteBoardId(id: string): boolean {
  return id.startsWith(WEBSITE_ID_PREFIX);
}

export function websiteOrderId(boardId: string): string {
  return boardId.slice(WEBSITE_ID_PREFIX.length);
}

interface TakeAppRow {
  id: string;
  number: string | null;
  store_name: string | null;
  store_alias: string | null;
  order_status: string | null;
  payment_status: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  line_items: unknown;
  total_amount: number | null;
  order_created_at: string | null;
  received_at: string;
  remark: string | null;
  kitchen_status: string | null;
}

/** How a store reads on a card. Falls back to whatever take.app called it. */
function storeLabel(row: TakeAppRow): string {
  const alias = (row.store_alias ?? "").trim().toLowerCase();
  const known = TRACKING_STORES.find((s) => s.alias.toLowerCase() === alias);
  return known?.label || (row.store_name ?? "").trim();
}

/**
 * take.app's status vocabulary, read as the board's.
 *
 * The branch's own move wins where it has made one. Below that, a cancelled or
 * completed order from take.app is taken at its word — the storefront knows
 * about a refund the kitchen never sees — and everything else starts as new.
 */
function boardStatus(row: TakeAppRow): string {
  const ours = (row.kitchen_status ?? "").trim().toLowerCase();
  if (ours) return ours;

  const theirs = (row.order_status ?? "").trim().toLowerCase();
  if (theirs === "cancelled" || theirs === "completed") return theirs;
  return "pending";
}

/** The board's line-item shape, from take.app's. */
function items(raw: unknown): { name: string; qty: number; extras: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const item = (entry ?? {}) as {
      name?: string;
      quantity?: number;
      options?: { name?: string; value?: string }[] | null;
    };
    const extras = Array.isArray(item.options)
      ? item.options
          .map((o) => [o?.name, o?.value].filter(Boolean).join(": "))
          .filter(Boolean)
          .join(", ")
      : "";
    return {
      name: String(item.name ?? "").trim(),
      qty: Math.max(1, Math.round(Number(item.quantity) || 1)),
      extras,
    };
  });
}

export interface WebsiteBoardOrder {
  id: string;
  source: "Website";
  source_label: string;
  code: string;
  order_number: number | null;
  status: string;
  order_type: string | null;
  table_section: string | null;
  guest_name: string;
  phone: string;
  items: { name: string; qty: number; extras: string }[];
  total_amount: number;
  payment_method: string | null;
  created_at: string;
  /** True for every website order — the card uses it to hide "take payment". */
  website: true;
  /** The customer's own tracking page, when the store is one we know. */
  tracking_url: string;
  note: string;
}

/**
 * Website orders since a moment, newest first.
 *
 * All four storefronts, because they are cooked in one kitchen at one branch
 * and a board that showed three of them would be exactly the gap this closes.
 * The store's name rides on the label so a cook can still tell them apart.
 */
export async function websiteOrders(since: string, limit = 120): Promise<WebsiteBoardOrder[]> {
  const { data, error } = await supabaseAdminLive
    .from("takeapp_orders")
    /* Named columns, not `*`: the board polls every fifteen seconds and `raw`
       is the entire take.app payload on every row. */
    .select(
      "id, number, store_name, store_alias, order_status, payment_status, customer_name, customer_phone, line_items, total_amount, order_created_at, received_at, remark, kitchen_status",
    )
    /* Dated by when take.app made the order. Rows written before that column
       existed have none, so received_at stands in — the alternative is a
       ticket that never appears because of a missing timestamp. */
    .or(`order_created_at.gte.${since},and(order_created_at.is.null,received_at.gte.${since})`)
    .order("order_created_at", { ascending: false })
    .limit(limit);

  /* A board that cannot reach take.app's table still has to show the counter
     and kiosk orders. Failing the whole request over the website half would
     take down the screen the kitchen is actually working from. */
  if (error || !data) return [];

  return (data as TakeAppRow[]).map((row) => {
    const store = storeLabel(row);
    const paid = (row.payment_status ?? "").trim().toLowerCase() === "paid";

    return {
      id: `${WEBSITE_ID_PREFIX}${row.id}`,
      source: "Website" as const,
      source_label: store ? `Website · ${store}` : "Website",
      /* take.app issues its own order number and the customer quotes it, so it
         is shown as it stands rather than renumbered under a prefix of ours. */
      code: (row.number ?? "").trim() || "WEB",
      order_number: null,
      status: boardStatus(row),
      order_type: null,
      table_section: null,
      guest_name: (row.customer_name ?? "").trim(),
      phone: (row.customer_phone ?? "").trim(),
      items: items(row.line_items),
      total_amount: (Number(row.total_amount) || 0) / MINOR_UNITS,
      // What the storefront says, not something the till can change.
      payment_method: paid ? "online" : "pending",
      created_at: row.order_created_at ?? row.received_at,
      website: true as const,
      tracking_url: hostForAlias(row.store_alias)
        ? `https://${hostForAlias(row.store_alias)}.twoinoneorder.com/orders/${encodeURIComponent(row.id)}/track`
        : "",
      note: (row.remark ?? "").trim(),
    };
  });
}

/** The branch's own move on a website order. take.app's status is left alone. */
export async function setWebsiteKitchenStatus(
  orderId: string,
  status: string,
  staffUuid: string,
): Promise<{ error: string | null }> {
  const { error } = await supabaseAdminLive
    .from("takeapp_orders")
    .update({
      kitchen_status: status,
      kitchen_moved_at: new Date().toISOString(),
      kitchen_moved_by: staffUuid,
    })
    .eq("id", orderId);

  return { error: error?.message ?? null };
}
