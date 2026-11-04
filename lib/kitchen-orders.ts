import { addonPrice, chosenAddons, countChosen, isSelectionComplete, type KalbaAddonGroup } from "@/lib/kalba/addons";
import { roundMoney, vatIncludedIn } from "@/lib/kalba/pricing";
import type { InvoiceOrder } from "@/lib/invoice";

/**
 * Turning what a customer's page sent into an order, using only prices from the
 * database. Nothing about money is taken from the browser. Kept free of server
 * imports so its rules can be exercised on their own.
 */

export type KitchenOrderStatus = "new" | "preparing" | "ready" | "served" | "cancelled";

export const MAX_ORDER_LINES = 50;
export const MAX_LINE_QTY = 50;
export const MAX_GUESTS = 20;

export interface OrderLineInput {
  dishId: string;
  qty: number;
  addonIds?: string[];
}

export interface OrderDish {
  id: string;
  name: string;
  price: number | string;
  kitchen: string;
}

export interface OrderItem {
  dish_id: string;
  name: string;
  kitchen: string;
  qty: number;
  unit_price: number;
  addons: { name: string; price: number }[];
  line_total: number;
  /** Which cooking this belongs to: 1 for the first, 2 for the first items added... */
  round?: number;
  added_at?: string;
  /** When the kitchen marked this item ready, if it did so item by item. */
  ready_at?: string;
}

export function priceOrder(
  lines: OrderLineInput[],
  dishes: OrderDish[],
  groupsByDish: Record<string, KalbaAddonGroup[]>,
): { items: OrderItem[]; total: number } | { error: string } {
  if (!Array.isArray(lines) || lines.length === 0) return { error: "Your order is empty." };
  if (lines.length > MAX_ORDER_LINES) return { error: "That order is too large." };

  const items: OrderItem[] = [];

  for (const line of lines) {
    const dish = dishes.find((d) => d.id === line?.dishId);
    if (!dish) return { error: "unavailable" };

    const qty = Number(line.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_LINE_QTY) return { error: "That quantity isn't valid." };

    const groups = groupsByDish[dish.id] ?? [];
    const selected = Array.isArray(line.addonIds) ? line.addonIds : [];

    if (!isSelectionComplete(groups, selected)) return { error: "unavailable" };
    if (groups.some((g) => g.max_select > 0 && countChosen(g, selected) > g.max_select)) {
      return { error: "unavailable" };
    }
    // Only add-ons that really belong to this dish are ever counted.
    const addons = chosenAddons(groups, selected).map((a) => ({ name: a.name, price: addonPrice(a) }));

    const unit = roundMoney(Number(dish.price) + addons.reduce((sum, a) => sum + a.price, 0));
    items.push({
      dish_id: dish.id,
      name: dish.name,
      kitchen: dish.kitchen,
      qty,
      unit_price: unit,
      addons,
      line_total: roundMoney(unit * qty),
    });
  }

  return { items, total: roundMoney(items.reduce((sum, i) => sum + i.line_total, 0)) };
}

/** Columns no list screen needs: the abuse hash, and what only Credit may show. */
export function withoutPrivate<T extends Record<string, unknown>>(row: T) {
  const rest: Record<string, unknown> = { ...row };
  for (const column of ["ip_hash", "client_ref", "credit_name", "credit_phone"]) delete rest[column];
  return rest;
}

export interface KitchenOrderForReceipt {
  id: string;
  order_number: number;
  table_code: string | null;
  guests: number;
  waiter_name: string | null;
  items: OrderItem[];
  total: number | string;
  discount?: number | string | null;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
}

/** A kitchen order in the shape the till's receipt template prints. */
export function receiptFromKitchenOrder(order: KitchenOrderForReceipt): InvoiceOrder {
  const discount = Number(order.discount ?? 0);
  // What the customer pays. The subtotal is set so that subtotal - discount + VAT adds up to it.
  const total = roundMoney(Number(order.total) - discount);
  return {
    id: order.id,
    order_number: order.order_number,
    type: "kitchens",
    order_type: "Dine in",
    guest_name: "",
    phone: "",
    table_id: order.table_code ?? "",
    table_section: "",
    guests: order.guests,
    notes: "",
    customer_note: "",
    status: order.status,
    // Only money actually taken prints as "Paid by".
    payment_method: order.paid_at ? (order.payment_method === "split" ? "cash + card" : order.payment_method ?? "pending") : "pending",
    created_at: order.created_at,
    items: (order.items ?? []).map((item) => {
      const extras = roundMoney((item.addons ?? []).reduce((sum, a) => sum + Number(a.price), 0));
      return {
        name: item.name,
        qty: item.qty,
        unit_price: roundMoney(Number(item.unit_price) - extras),
        extras: (item.addons ?? []).map((a) => a.name).join(", ") || undefined,
        extras_price: extras || undefined,
        // Tells the kitchen this is the part still to cook.
        note: (item.round ?? 1) > 1 ? "Added item" : undefined,
        line_total: Number(item.line_total),
      };
    }),
    subtotal: roundMoney(total - vatIncludedIn(total) + discount),
    discount_total: discount,
    tax_amount: vatIncludedIn(total),
    total_amount: total,
  };
}

/** One step in an order's history, stored in its events column. */
export interface OrderEvent {
  type: "preparing" | "ready" | "served" | "cancelled" | "items_added" | "items_changed" | "item_ready" | "item_not_ready" | "paid" | "part_paid" | "credit" | "payment_undone";
  at: string;
  method?: string;
  name?: string;
  count?: number;
  amount?: number;
  discount?: number;
  /** Items added while the order was still being cooked, so it stayed in the kitchen. */
  same_round?: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  preparing: "Kitchen started preparing",
  ready: "Ready in the kitchen",
  served: "Served to the table",
  cancelled: "Cancelled",
  credit: "Put on credit",
  payment_undone: "Payment undone",
};

function eventLabel(event: OrderEvent): string {
  if (event.type === "item_ready") return `${event.name ?? "An item"} ready`;
  if (event.type === "item_not_ready") return `${event.name ?? "An item"} not ready after all`;
  if (event.type === "items_changed") {
    const count = event.count ?? 0;
    return count > 0 ? `${count} item${count === 1 ? "" : "s"} taken off by the waiter` : "Items changed by the waiter";
  }
  if (event.type === "items_added") {
    const count = event.count ?? 0;
    return `${count} item${count === 1 ? "" : "s"} added${event.same_round ? "" : ", back to the kitchen"}`;
  }
  const how = event.method === "card" ? " by card" : event.method === "cash" ? " in cash" : event.method === "split" ? " in cash and card" : "";
  const sum = event.amount ? ` AED ${event.amount.toFixed(2)}` : "";
  const off = event.discount ? `, AED ${event.discount.toFixed(2)} discount` : "";
  if (event.type === "paid") return `Paid${sum}${how}${off}`;
  if (event.type === "part_paid") return `Part paid${sum}${how}${off}`;
  if (event.type === "credit" && (event.amount || event.discount)) return `Put on credit after${sum ? `${sum} paid${how}` : ""}${off}`;
  return EVENT_LABELS[event.type] ?? event.type;
}

/**
 * Everything that happened to an order, oldest first. Orders from before history
 * was recorded still show the times they do have.
 */
export function orderTimeline(order: {
  created_at: string;
  ready_at?: string | null;
  served_at?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  events?: OrderEvent[] | null;
}): { label: string; at: string }[] {
  const events = [...(order.events ?? [])];
  const has = (type: OrderEvent["type"]) => events.some((e) => e.type === type);
  if (order.ready_at && !has("ready")) events.push({ type: "ready", at: order.ready_at });
  if (order.served_at && !has("served")) events.push({ type: "served", at: order.served_at });
  if (order.paid_at && !has("paid")) events.push({ type: "paid", at: order.paid_at, method: order.payment_method ?? undefined });

  return [
    { label: "Order received", at: order.created_at },
    ...events
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
      .map((event) => ({ label: eventLabel(event), at: event.at })),
  ];
}
