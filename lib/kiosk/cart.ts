/**
 * What the kiosk basket costs.
 *
 * The arithmetic is the branch page's, not a second opinion: a dish's own offer
 * comes off its price, chosen extras are added on top of the discounted price,
 * and the Privilege Card then applies to the basket. Anything else and the same
 * order would ring up differently at the kiosk than on the phone.
 */

import { addonsTotal, type AddonSelection, type KalbaAddonGroup } from "@/lib/kalba/addons";
import { discountedPrice, roundMoney, toPercent, vatIncludedIn } from "@/lib/kalba/pricing";
import type { KioskItem } from "@/lib/kiosk/types";

/** itemId → how many. A line is one dish, however many of it are in the cart. */
export type KioskQty = Record<string, number>;

export interface KioskLine {
  item: KioskItem;
  qty: number;
  /** Menu price of one, before this dish's own offer. */
  listPrice: number;
  /** After the dish's offer, before extras. */
  netPrice: number;
  /** What one of this line actually costs: netPrice plus the chosen extras. */
  unitPrice: number;
  extrasPrice: number;
  lineTotal: number;
  /** What the dish's own offer takes off this line, across every unit. */
  offerSaving: number;
  groups: KalbaAddonGroup[];
}

export interface KioskTotals {
  lines: KioskLine[];
  /** How many dishes are in the basket, counting each helping. */
  count: number;
  /** What the lines come to, offers already applied. The "Subtotal" on screen. */
  subtotal: number;
  /** What the per-dish offers took off. */
  itemOffers: number;
  /** What the Privilege Card takes off the subtotal. 0 without one. */
  privilegeDiscount: number;
  /** Offers and card together — the "You save" figure. */
  totalSaved: number;
  /** Charged on a delivery order, waived over the threshold. Never discounted. */
  deliveryCharge: number;
  /** What the customer owes. */
  total: number;
  /** The VAT already inside `total`, not a charge on top of it. */
  vat: number;
}

export function itemPrice(item: KioskItem): number {
  const n = parseFloat(String(item.price));
  return Number.isFinite(n) ? n : 0;
}

export function lineFor(
  item: KioskItem,
  qty: number,
  addons: AddonSelection,
): KioskLine {
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
    unitPrice,
    extrasPrice,
    lineTotal: roundMoney(unitPrice * qty),
    offerSaving: roundMoney((listPrice - netPrice) * qty),
    groups,
  };
}

/**
 * Prices the whole basket.
 *
 * `privilegePercent` is the card's own rate, or 0 when no card was scanned —
 * so the caller can hand the result straight in without checking first.
 */
export function kioskTotals(
  items: KioskItem[],
  qty: KioskQty,
  addons: AddonSelection,
  privilegePercent = 0,
  delivery?: { charge: number; freeOver: number } | null,
): KioskTotals {
  const lines = items
    .filter((item) => (qty[item.id] ?? 0) > 0)
    .map((item) => lineFor(item, qty[item.id], addons));

  const subtotal = roundMoney(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const itemOffers = roundMoney(lines.reduce((sum, l) => sum + l.offerSaving, 0));

  const percent = toPercent(privilegePercent);
  const privilegeDiscount = percent > 0 ? roundMoney((subtotal * percent) / 100) : 0;
  /* Added after the card comes off, and never discounted by it: 10% off a
     customer's lunch should not take 10% off the driver's fee. */
  const deliveryCharge =
    delivery && subtotal > 0 && !(delivery.freeOver > 0 && subtotal >= delivery.freeOver)
      ? roundMoney(delivery.charge)
      : 0;

  const total = roundMoney(subtotal - privilegeDiscount + deliveryCharge);

  return {
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal,
    itemOffers,
    privilegeDiscount,
    totalSaved: roundMoney(itemOffers + privilegeDiscount),
    deliveryCharge,
    total,
    vat: vatIncludedIn(total),
  };
}

/** "AED 31.00" — two decimals everywhere, so a screen of prices lines up. */
export function aed(value: number): string {
  return `AED ${value.toFixed(2)}`;
}
