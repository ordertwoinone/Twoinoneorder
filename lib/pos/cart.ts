import { addonsTotal, type AddonSelection, type KalbaAddonGroup } from "@/lib/kalba/addons";
import { discountedPrice, roundMoney, toPercent, vatIncludedIn } from "@/lib/kalba/pricing";
import type { KioskItem } from "@/lib/kiosk/types";

/**
 * What a till order comes to.
 *
 * The same arithmetic as the kiosk and the website — a dish's own offer, then
 * extras, then anything off the basket — with the two things only a till has:
 * a delivery charge, and a discount a cashier can key in by hand.
 *
 * The order matters and is not arbitrary. Delivery is charged on top of the
 * food and is not discounted, because taking 20% off a customer's bill should
 * not quietly take 20% off the driver's fee; and VAT is read out of the final
 * total rather than added to it, because UAE menu prices already include it.
 */

/** What the till can be selling. */
export type PosOrderType = "dine_in" | "takeaway" | "delivery";

export const ORDER_TYPE_LABEL: Record<PosOrderType, string> = {
  dine_in: "Dine In",
  takeaway: "Take Away",
  delivery: "Delivery",
};

/**
 * How the money came in — or did not.
 *
 * The last three are not payment methods in the way the first three are, and
 * the day close treats them differently on purpose:
 *
 *   staff_food is a meal given to somebody who works here. It is a cost, not a
 *   sale, and counting it as revenue would inflate the day's takings by every
 *   staff lunch. It appears on the close as its own figure.
 *
 *   credit is a sale made and not yet collected — a regular who settles at the
 *   end of the month. Real revenue, no money in the drawer.
 *
 *   pending is nothing at all yet: the food is going out and the money is
 *   coming later today. It is what a kiosk order carries until somebody at the
 *   counter takes the cash.
 *
 * All three used to fall through to "online" for want of anywhere else to go,
 * which quietly booked every staff lunch as an online sale.
 */
export type PosPayment = "cash" | "card" | "online" | "staff_food" | "credit" | "pending";

export const PAYMENT_LABEL: Record<PosPayment, string> = {
  cash: "Cash",
  card: "Card",
  online: "Online",
  staff_food: "Staff Food",
  credit: "Credit",
  pending: "Pending",
};

/** The three that put money in the branch's hands today. */
export const SETTLED_PAYMENTS: PosPayment[] = ["cash", "card", "online"];

export type PosQty = Record<string, number>;

/** A discount keyed in by hand: either a percentage or a flat amount. */
export interface PosDiscount {
  mode: "percent" | "amount";
  value: number;
  reason?: string;
}

export interface PosLine {
  item: KioskItem;
  qty: number;
  listPrice: number;
  netPrice: number;
  extrasPrice: number;
  unitPrice: number;
  lineTotal: number;
  offerSaving: number;
  groups: KalbaAddonGroup[];
}

export interface PosTotals {
  lines: PosLine[];
  count: number;
  /** The food, offers already applied. */
  itemsTotal: number;
  /** What the per-dish offers took off. */
  itemOffers: number;
  /** Charged on delivery orders, waived over the threshold. Never discounted. */
  deliveryCharge: number;
  /** What the keyed-in discount and any coupon took off the food. */
  discount: number;
  /** Food, less discount, plus delivery. What the customer pays. */
  total: number;
  /** The VAT already inside `total`. */
  vat: number;
  /** Offers plus discount — the "you saved" figure. */
  totalSaved: number;
}

export function itemPrice(item: KioskItem): number {
  const n = parseFloat(String(item.price));
  return Number.isFinite(n) ? n : 0;
}

export function posLine(item: KioskItem, qty: number, addons: AddonSelection): PosLine {
  const groups = item.addon_groups ?? [];
  const listPrice = itemPrice(item);
  const netPrice = discountedPrice(listPrice, item.discount_percent ?? 0);
  const extrasPrice = addonsTotal(groups, addons[item.id]);
  const unitPrice = roundMoney(netPrice + extrasPrice);

  return {
    item,
    qty,
    listPrice,
    netPrice,
    extrasPrice,
    unitPrice,
    lineTotal: roundMoney(unitPrice * qty),
    offerSaving: roundMoney((listPrice - netPrice) * qty),
    groups,
  };
}

export interface PosTotalsInput {
  items: KioskItem[];
  qty: PosQty;
  addons: AddonSelection;
  orderType: PosOrderType;
  deliveryCharge?: number;
  freeDeliveryOver?: number;
  discount?: PosDiscount | null;
  /** Already-resolved coupon value in AED, if one was applied. */
  couponAmount?: number;
}

export function posTotals({
  items,
  qty,
  addons,
  orderType,
  deliveryCharge = 0,
  freeDeliveryOver = 0,
  discount = null,
  couponAmount = 0,
}: PosTotalsInput): PosTotals {
  const lines = items
    .filter((item) => (qty[item.id] ?? 0) > 0)
    .map((item) => posLine(item, qty[item.id], addons));

  const itemsTotal = roundMoney(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const itemOffers = roundMoney(lines.reduce((sum, l) => sum + l.offerSaving, 0));

  const delivery =
    orderType === "delivery" && itemsTotal > 0
      ? freeDeliveryOver > 0 && itemsTotal >= freeDeliveryOver
        ? 0
        : roundMoney(deliveryCharge)
      : 0;

  let keyed = 0;
  if (discount && discount.value > 0) {
    keyed =
      discount.mode === "percent"
        ? roundMoney((itemsTotal * toPercent(discount.value)) / 100)
        : roundMoney(discount.value);
  }

  /* Capped at the food. A discount larger than the basket would otherwise eat
     into the delivery charge and, past that, hand money back. */
  const off = Math.min(itemsTotal, roundMoney(keyed + Math.max(0, couponAmount)));
  const total = roundMoney(itemsTotal - off + delivery);

  return {
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    itemsTotal,
    itemOffers,
    deliveryCharge: delivery,
    discount: off,
    total,
    vat: vatIncludedIn(total),
    totalSaved: roundMoney(itemOffers + off),
  };
}

/** "ORD-1048" — what is printed on the docket and read out at the counter. */
export function posOrderCode(prefix: string, orderNumber: number | null | undefined): string {
  const clean = (prefix || "ORD").trim().toUpperCase();
  return orderNumber ? `${clean}-${orderNumber}` : clean;
}

export function aed(value: number): string {
  return `AED ${value.toFixed(2)}`;
}
