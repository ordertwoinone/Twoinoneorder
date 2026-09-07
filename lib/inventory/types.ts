/**
 * The shapes and the arithmetic of stock control, in one file both sides read.
 *
 * The API builds a sheet with these rules and the admin screen re-runs them on
 * every keystroke so the totals move as you type. Keeping them here means the
 * two can never disagree about what a closing balance is — which they would,
 * immediately, if the screen did its own sums.
 */

export type MovementKind =
  | "opening"
  | "received"
  | "consumed"
  | "writeoff"
  | "waste"
  | "count_adjustment";

/**
 * Which way each kind moves the balance.
 *
 * count_adjustment is +1 because it is the one kind that stores a signed
 * quantity: a count that found less writes -2, and multiplying that by -1
 * would turn a shortage into a windfall.
 */
export const KIND_DIRECTION: Record<MovementKind, 1 | -1> = {
  opening: 1,
  received: 1,
  consumed: -1,
  writeoff: -1,
  waste: -1,
  count_adjustment: 1,
};

export const KIND_LABEL: Record<MovementKind, string> = {
  opening: "Opening Balance",
  received: "Goods Received",
  consumed: "Stock Consumed",
  writeoff: "Write-off",
  waste: "Waste & Expiry",
  count_adjustment: "Count Adjustment",
};

/** The reasons a write-off or a waste entry is allowed to give. */
export const WRITEOFF_REASONS = [
  "Damaged",
  "Expired",
  "Spillage",
  "Breakage",
  "Theft",
  "Sample / Tasting",
  "Other",
] as const;

export const UOM_OPTIONS = [
  "Can", "Bottle", "Pack", "Box", "Carton", "Kg", "Gram", "Litre", "ml", "Piece", "Unit",
] as const;

export interface InventoryItem {
  id: string;
  name: string;
  name_ar: string;
  sku: string | null;
  category: string;
  uom: string;
  location: string;
  unit_cost: number;
  nrv: number;
  reorder_level: number;
  image_url: string;
  is_active: boolean;
  sort_order: number;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  movement_date: string;
  kind: MovementKind;
  quantity: number;
  unit_cost: number;
  reason: string;
  reference: string;
  note: string;
  count_id: string | null;
  entered_by: string;
  created_at?: string;
  /** Joined in by the ledger and register screens, which show the item name. */
  item?: Pick<InventoryItem, "id" | "name" | "uom" | "category"> | null;
}

export interface InventoryCount {
  id: string;
  reference: string;
  count_date: string;
  location: string;
  status: "draft" | "posted";
  entered_by: string;
  notes: string;
  posted_at: string | null;
}

/** One line of the count sheet: the item, the period's movements, and the count. */
export interface SheetRow {
  item: InventoryItem;
  /** Balance of everything dated before the first day of the sheet's period. */
  opening: number;
  received: number;
  consumed: number;
  writeoffs: number;
  waste: number;
  /** NULL until somebody counts it — which is not the same as counting zero. */
  physical: number | null;
  note: string;
}

export interface SheetPayload {
  count: InventoryCount;
  rows: SheetRow[];
  /** The write-off and waste movements behind the two columns, for the register. */
  register: InventoryMovement[];
  /* The stretch the movement columns cover. Equal on a one-day sheet, which is
     what the screen opens on and the only shape that can be counted and posted. */
  from: string;
  to: string;
}

/* ── The arithmetic ───────────────────────────────────────────────────────── */

/** What the books say is left at the end of the day. */
export function bookClosing(row: SheetRow): number {
  return round3(row.opening + row.received - row.consumed - row.writeoffs - row.waste);
}

/** What a count found less what the books expected. Null until it is counted. */
export function variance(row: SheetRow): number | null {
  if (row.physical === null) return null;
  return round3(row.physical - bookClosing(row));
}

/**
 * IAS 2: stock is carried at the lower of cost and net realisable value. An
 * item priced with no NRV set is carried at cost rather than written to zero.
 */
export function carryingRate(item: Pick<InventoryItem, "unit_cost" | "nrv">): number {
  if (!item.nrv) return item.unit_cost;
  return Math.min(item.unit_cost, item.nrv);
}

/**
 * The value the sheet carries the line at.
 *
 * The book figure, not the counted one, for as long as the count is a draft —
 * a half-typed sheet must not restate the stock on hand, and until it is posted
 * the count is an observation rather than an accepted correction. Posting
 * writes the variance into the ledger, at which point the two agree anyway.
 */
export function carryingValue(row: SheetRow): number {
  return round2(bookClosing(row) * carryingRate(row.item));
}

export function writeOffValue(m: Pick<InventoryMovement, "quantity" | "unit_cost">): number {
  return round2(m.quantity * m.unit_cost);
}

export type RowStatus = "matched" | "shortage" | "excess" | "uncounted";

export function rowStatus(row: SheetRow): RowStatus {
  const v = variance(row);
  if (v === null) return "uncounted";
  if (v === 0) return "matched";
  return v < 0 ? "shortage" : "excess";
}

export const STATUS_STYLE: Record<RowStatus, { label: string; className: string }> = {
  matched:   { label: "Matched",  className: "bg-emerald-50 text-emerald-700" },
  shortage:  { label: "Shortage", className: "bg-red-50 text-red-600" },
  excess:    { label: "Excess",   className: "bg-blue-50 text-blue-600" },
  uncounted: { label: "Not counted", className: "bg-gray-100 text-gray-500" },
};

/* ── Formatting ───────────────────────────────────────────────────────────── */

/** Quantities are whole cans far more often than not, so trailing .000 goes. */
export function qty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(round3(n));
}

export function money(n: number): string {
  return n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function aed(n: number): string {
  return `AED ${money(n)}`;
}

export function signed(n: number): string {
  return n > 0 ? `+${qty(n)}` : qty(n);
}

/* Money and quantities both come back from Postgres numerics as JS floats, so
   every derived figure is rounded at the point it is produced. Without it a
   sheet of twenty-eight lines reliably totals to something like 842.3499999. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function round3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

/** A date as Postgres wants it, in the browser's own day rather than UTC's. */
export function isoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 06 Sep 2026 — the format the rest of the panel prints dates in. */
export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d).padStart(2, "0")} ${months[m - 1]} ${y}`;
}
