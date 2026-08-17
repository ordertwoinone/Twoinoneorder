import type { TakeAppOrder, TakeAppService } from "@/lib/takeapp-orders";

/**
 * The two sources of orders — the merchant API and the webhook — send the same
 * order shape, and both land in takeapp_orders. Mapping lives here so a row
 * written by a webhook is indistinguishable from one written by a backfill.
 */

export interface TakeAppOrderRow {
  id: string;
  number: string;
  name: string;
  store_name: string;
  store_alias: string;
  order_status: string;
  payment_status: string;
  fulfillment_status: string;
  customer_name: string;
  customer_phone: string;
  line_items: unknown;
  total_amount: number;
  currency: string;
  remark: string | null;
  schedule: string | null;
  order_created_at: string | null;
  last_event: string;
  raw: unknown;
  updated_at: string;
}

const str = (value: unknown): string => (typeof value === "string" ? value : "");

export function toOrderRow(order: TakeAppOrder, event: string): TakeAppOrderRow {
  return {
    id: String(order.id),
    number: str(order.number),
    name: str(order.name),
    store_name: str(order.store?.name),
    store_alias: str(order.store?.alias),
    order_status: str(order.order_status) || "pending",
    payment_status: str(order.payment_status) || "pending",
    fulfillment_status: str(order.fulfillment_status) || "unfulfilled",
    customer_name: str(order.customer?.name),
    customer_phone: str(order.customer?.phone),
    line_items: Array.isArray(order.line_items) ? order.line_items : [],
    total_amount: Number.isFinite(order.total_amount) ? Math.trunc(order.total_amount) : 0,
    currency: str(order.currency) || "AED",
    remark: order.remark ?? null,
    schedule: order.schedule ?? null,
    order_created_at: order.created_at ?? null,
    last_event: event,
    raw: order,
    updated_at: new Date().toISOString(),
  };
}

/** The row shape turned back into what the Live Orders screen renders. */
export function fromOrderRow(row: TakeAppOrderRow): TakeAppOrder {
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    store: { name: row.store_name, alias: row.store_alias },
    order_status: row.order_status,
    payment_status: row.payment_status,
    fulfillment_status: row.fulfillment_status,
    customer: { name: row.customer_name, phone: row.customer_phone },
    line_items: Array.isArray(row.line_items) ? (row.line_items as TakeAppOrder["line_items"]) : [],
    total_amount: row.total_amount,
    currency: row.currency,
    created_at: row.order_created_at ?? "",
    remark: row.remark,
    schedule: row.schedule,
    /* The delivery address and its pin were never given columns of their own,
       but the whole payload is kept in `raw` — so they are recovered from
       there rather than needing a migration and a backfill. */
    service: (row.raw as { service?: TakeAppService } | null)?.service ?? null,
  };
}
