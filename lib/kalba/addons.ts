/**
 * Add-ons for the Popular Around Campus items.
 *
 * The branch page and the menu page each carry their own cart, and both have to
 * price, display and send extras identically — so the arithmetic and the wording
 * live here rather than being written twice and drifting apart.
 *
 * A selection is per item, not per cart line: putting two Zinger Combos in the
 * cart and ticking "extra cheese" means cheese on both. The cart is a short list
 * of dishes, not a spreadsheet, and asking twice for the same dish reads as a
 * mistake to the person tapping.
 */

export interface KalbaAddon {
  id: string;
  item_id: string;
  name: string;
  name_ar?: string | null;
  /** AED. Comes back from Postgres numeric as a string often enough to matter. */
  price: number | string;
  sort_order?: number;
}

/** itemId → the add-on ids the shopper ticked. */
export type AddonSelection = Record<string, string[]>;

export function addonPrice(addon: KalbaAddon): number {
  const n = typeof addon.price === "number" ? addon.price : parseFloat(addon.price);
  return Number.isFinite(n) ? n : 0;
}

/** Groups a flat table read into the shape the item list wants. */
export function groupAddons(rows: KalbaAddon[]): Record<string, KalbaAddon[]> {
  const byItem: Record<string, KalbaAddon[]> = {};
  for (const row of rows) {
    (byItem[row.item_id] ??= []).push(row);
  }
  return byItem;
}

/** The ticked add-ons, in the order admin arranged them. */
export function chosenAddons(addons: KalbaAddon[], selectedIds: string[] | undefined): KalbaAddon[] {
  if (!selectedIds?.length) return [];
  const wanted = new Set(selectedIds);
  return addons.filter((a) => wanted.has(a.id));
}

/** What the ticked add-ons add to one unit of the dish. */
export function addonsTotal(addons: KalbaAddon[], selectedIds: string[] | undefined): number {
  return chosenAddons(addons, selectedIds).reduce((sum, a) => sum + addonPrice(a), 0);
}

/**
 * Ticking an add-on on and off again.
 *
 * Returns a whole new selection so it can be handed straight to a state setter.
 */
export function toggleAddon(
  selection: AddonSelection,
  itemId: string,
  addonId: string,
): AddonSelection {
  const current = selection[itemId] ?? [];
  const next = current.includes(addonId)
    ? current.filter((id) => id !== addonId)
    : [...current, addonId];
  return { ...selection, [itemId]: next };
}

/**
 * A one-line summary for the order message: "Extra cheese, Fries".
 *
 * `label` picks the language, so the caller decides whether the kitchen reads
 * this in English or the shopper's Arabic.
 */
export function addonSummary(
  addons: KalbaAddon[],
  selectedIds: string[] | undefined,
  label: (addon: KalbaAddon) => string,
): string {
  return chosenAddons(addons, selectedIds).map(label).join(", ");
}
