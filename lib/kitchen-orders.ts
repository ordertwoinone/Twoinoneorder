import { addonPrice, chosenAddons, countChosen, isSelectionComplete, type KalbaAddonGroup } from "@/lib/kalba/addons";
import { roundMoney } from "@/lib/kalba/pricing";

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
