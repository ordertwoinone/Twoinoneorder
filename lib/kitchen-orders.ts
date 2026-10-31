import { addonPrice, chosenAddons, countChosen, isSelectionComplete, type KalbaAddonGroup } from "@/lib/kalba/addons";
import { roundMoney, vatIncludedIn } from "@/lib/kalba/pricing";
import type { InvoiceOrder } from "@/lib/invoice";

/**
 * Turning what a customer's page sent into an order, using only prices from the
 * database. Nothing about money is taken from the browser. Kept free of server
 * imports so its rules can be exercised on their own.
 */

export type KitchenOrderStatus = "new" | "preparing" | "served" | "cancelled";

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
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
}

/** A kitchen order in the shape the till's receipt template prints. */
export function receiptFromKitchenOrder(order: KitchenOrderForReceipt): InvoiceOrder {
  const total = Number(order.total);
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
    payment_method: order.paid_at ? order.payment_method ?? "pending" : "pending",
    created_at: order.created_at,
    items: (order.items ?? []).map((item) => {
      const extras = roundMoney((item.addons ?? []).reduce((sum, a) => sum + Number(a.price), 0));
      return {
        name: item.name,
        qty: item.qty,
        unit_price: roundMoney(Number(item.unit_price) - extras),
        extras: (item.addons ?? []).map((a) => a.name).join(", ") || undefined,
        extras_price: extras || undefined,
        line_total: Number(item.line_total),
      };
    }),
    subtotal: roundMoney(total - vatIncludedIn(total)),
    discount_total: 0,
    tax_amount: vatIncludedIn(total),
    total_amount: total,
  };
}
