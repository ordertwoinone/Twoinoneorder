/**
 * Choice groups and add-ons for the Popular Around Campus items.
 *
 * A group is a question — "Choice of Side item" — and its add-ons are the
 * answers. `min_select` decides whether it must be answered, `max_select` how
 * many answers it takes; between them they cover every shape the menu needs,
 * from a required single pick to an open-ended list of extras.
 *
 * The branch page and the menu page each carry their own cart and both have to
 * price, validate and describe a selection identically, so all of that lives
 * here rather than being written twice and drifting apart.
 *
 * A selection is per item, not per cart line: two of the same dish share one set
 * of answers. The cart is a short list of dishes, not a spreadsheet.
 */

export interface KalbaAddon {
  id: string;
  item_id: string;
  /** The question this answers. Null for extras that predate groups. */
  group_id?: string | null;
  name: string;
  name_ar?: string | null;
  /** Optional thumbnail. Blank is normal — most extras read fine as text. */
  image_url?: string | null;
  /** AED. Comes back from Postgres numeric as a string often enough to matter. */
  price: number | string;
  sort_order?: number;
}

export interface KalbaAddonGroup {
  id: string;
  item_id: string;
  name: string;
  name_ar?: string | null;
  /** 0 = skippable. 1+ = must be answered. */
  min_select: number;
  /** 0 = no ceiling. 1 = a single choice. */
  max_select: number;
  sort_order?: number;
  /** The answers, in the order admin arranged them. */
  options: KalbaAddon[];
}

/** itemId → every add-on id the shopper has ticked, across all its groups. */
export type AddonSelection = Record<string, string[]>;

/** The id given to the catch-all group that holds add-ons from before groups. */
export const LOOSE_GROUP_ID = "__loose__";

export function addonPrice(addon: KalbaAddon): number {
  const n = typeof addon.price === "number" ? addon.price : parseFloat(addon.price);
  return Number.isFinite(n) ? n : 0;
}

/** A group that takes exactly one answer is drawn as radio buttons. */
export function isSingleChoice(group: KalbaAddonGroup): boolean {
  return group.max_select === 1;
}

export function isRequired(group: KalbaAddonGroup): boolean {
  return group.min_select > 0;
}

/**
 * Builds each item's questions from the two flat table reads.
 *
 * Add-ons with no group are gathered into one optional group at the end, so a
 * dish set up before groups existed still offers its extras rather than losing
 * them the day the migration runs.
 */
export function buildGroups(
  groups: Omit<KalbaAddonGroup, "options">[],
  addons: KalbaAddon[],
  looseGroupName: string,
): Record<string, KalbaAddonGroup[]> {
  const byItem: Record<string, KalbaAddonGroup[]> = {};

  for (const group of groups) {
    (byItem[group.item_id] ??= []).push({ ...group, options: [] });
  }

  const loose: Record<string, KalbaAddon[]> = {};

  for (const addon of addons) {
    if (!addon.group_id) {
      (loose[addon.item_id] ??= []).push(addon);
      continue;
    }
    const group = byItem[addon.item_id]?.find((g) => g.id === addon.group_id);
    // A group_id pointing nowhere would silently swallow the add-on; keep it.
    if (group) group.options.push(addon);
    else (loose[addon.item_id] ??= []).push(addon);
  }

  for (const [itemId, options] of Object.entries(loose)) {
    (byItem[itemId] ??= []).push({
      id: LOOSE_GROUP_ID,
      item_id: itemId,
      name: looseGroupName,
      min_select: 0,
      max_select: 0,
      sort_order: 9999,
      options,
    });
  }

  // A group with nothing in it is a question with no answers — never ask it.
  for (const itemId of Object.keys(byItem)) {
    byItem[itemId] = byItem[itemId].filter((g) => g.options.length > 0);
    if (byItem[itemId].length === 0) delete byItem[itemId];
  }

  return byItem;
}

/** Every option across every group, for pricing and summarising. */
export function allOptions(groups: KalbaAddonGroup[]): KalbaAddon[] {
  return groups.flatMap((g) => g.options);
}

/** The ticked options, in the order they are shown. */
export function chosenAddons(
  groups: KalbaAddonGroup[],
  selectedIds: string[] | undefined,
): KalbaAddon[] {
  if (!selectedIds?.length) return [];
  const wanted = new Set(selectedIds);
  return allOptions(groups).filter((a) => wanted.has(a.id));
}

/** What the ticked options add to one unit of the dish. */
export function addonsTotal(
  groups: KalbaAddonGroup[],
  selectedIds: string[] | undefined,
): number {
  return chosenAddons(groups, selectedIds).reduce((sum, a) => sum + addonPrice(a), 0);
}

/** How many of a group's options are ticked. */
export function countChosen(group: KalbaAddonGroup, selectedIds: string[] | undefined): number {
  if (!selectedIds?.length) return 0;
  const wanted = new Set(selectedIds);
  return group.options.reduce((n, o) => n + (wanted.has(o.id) ? 1 : 0), 0);
}

export function isGroupSatisfied(
  group: KalbaAddonGroup,
  selectedIds: string[] | undefined,
): boolean {
  return countChosen(group, selectedIds) >= group.min_select;
}

/** Whether the dish may go in the cart: every required question answered. */
export function isSelectionComplete(
  groups: KalbaAddonGroup[],
  selectedIds: string[] | undefined,
): boolean {
  return groups.every((g) => isGroupSatisfied(g, selectedIds));
}

/** The first question still unanswered, so the sheet can say which. */
export function firstUnsatisfied(
  groups: KalbaAddonGroup[],
  selectedIds: string[] | undefined,
): KalbaAddonGroup | null {
  return groups.find((g) => !isGroupSatisfied(g, selectedIds)) ?? null;
}

/**
 * Ticking an option, with the group's own rules applied.
 *
 * A single-choice group replaces its answer rather than adding to it, and a
 * group at its ceiling drops the option chosen longest ago instead of refusing
 * the tap — a tap that appears to do nothing reads as broken.
 */
export function toggleOption(
  selection: AddonSelection,
  itemId: string,
  group: KalbaAddonGroup,
  addonId: string,
): AddonSelection {
  const current = selection[itemId] ?? [];

  if (current.includes(addonId)) {
    // Un-ticking the only answer to a required question is not an improvement.
    if (isSingleChoice(group) && isRequired(group)) return selection;
    return { ...selection, [itemId]: current.filter((id) => id !== addonId) };
  }

  const inGroup = new Set(group.options.map((o) => o.id));
  const others = current.filter((id) => !inGroup.has(id));
  const mine = current.filter((id) => inGroup.has(id));

  if (isSingleChoice(group)) {
    return { ...selection, [itemId]: [...others, addonId] };
  }

  const ceiling = group.max_select > 0 ? group.max_select : Infinity;
  const kept = mine.length >= ceiling ? mine.slice(mine.length - ceiling + 1) : mine;

  return { ...selection, [itemId]: [...others, ...kept, addonId] };
}

/**
 * The answers a dish starts with.
 *
 * A required single-choice group is opened on its first option: the shopper has
 * to pick something, and pre-filling the cheapest-listed answer is friendlier
 * than an error message they have not earned yet.
 */
export function defaultSelection(groups: KalbaAddonGroup[]): string[] {
  return groups
    .filter((g) => isSingleChoice(g) && isRequired(g) && g.options.length > 0)
    .map((g) => g.options[0].id);
}

/**
 * A one-line summary for the order message: "Regular Fries, Extra cheese".
 *
 * `label` picks the language, so the caller decides whether the kitchen reads
 * this in English or the shopper's Arabic.
 */
export function addonSummary(
  groups: KalbaAddonGroup[],
  selectedIds: string[] | undefined,
  label: (addon: KalbaAddon) => string,
): string {
  return chosenAddons(groups, selectedIds).map(label).join(", ");
}
