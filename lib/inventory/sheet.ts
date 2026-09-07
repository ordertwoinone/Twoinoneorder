import { supabaseAdminLive } from "@/lib/supabase-admin";
import {
  KIND_DIRECTION,
  round3,
  type InventoryCount,
  type InventoryItem,
  type InventoryMovement,
  type MovementKind,
  type SheetPayload,
  type SheetRow,
} from "@/lib/inventory/types";

/**
 * Building the count sheet for one day.
 *
 * Every column on that screen except the physical count is derived here, from
 * the ledger, on every read. Nothing is cached and no running total is stored,
 * which is the point: a sheet opened on Tuesday for last Friday shows what
 * Friday's ledger says today, including the delivery somebody keyed in late.
 * A stored balance would have frozen Friday's answer at whatever was known on
 * Friday and quietly disagreed with its own movements from then on.
 */

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

/** Postgres numerics arrive as strings; the screen wants numbers throughout. */
export function normaliseItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    name_ar: String(row.name_ar ?? ""),
    sku: (row.sku as string | null) ?? null,
    category: String(row.category ?? "Uncategorised"),
    uom: String(row.uom ?? "Unit"),
    location: String(row.location ?? ""),
    unit_cost: num(row.unit_cost),
    nrv: num(row.nrv),
    reorder_level: num(row.reorder_level),
    image_url: String(row.image_url ?? ""),
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? 0),
  };
}

export function normaliseMovement(row: Record<string, unknown>): InventoryMovement {
  const item = row.item as Record<string, unknown> | null | undefined;
  return {
    id: String(row.id),
    item_id: String(row.item_id),
    movement_date: String(row.movement_date ?? "").slice(0, 10),
    kind: String(row.kind) as MovementKind,
    quantity: num(row.quantity),
    unit_cost: num(row.unit_cost),
    reason: String(row.reason ?? ""),
    reference: String(row.reference ?? ""),
    note: String(row.note ?? ""),
    count_id: (row.count_id as string | null) ?? null,
    entered_by: String(row.entered_by ?? ""),
    created_at: row.created_at ? String(row.created_at) : undefined,
    item: item
      ? {
          id: String(item.id ?? row.item_id),
          name: String(item.name ?? ""),
          uom: String(item.uom ?? ""),
          category: String(item.category ?? ""),
        }
      : null,
  };
}

function normaliseCount(row: Record<string, unknown>): InventoryCount {
  return {
    id: String(row.id),
    reference: String(row.reference ?? ""),
    count_date: String(row.count_date ?? "").slice(0, 10),
    location: String(row.location ?? ""),
    status: row.status === "posted" ? "posted" : "draft",
    entered_by: String(row.entered_by ?? ""),
    notes: String(row.notes ?? ""),
    posted_at: (row.posted_at as string | null) ?? null,
  };
}

/** The stock-take for a day and a place, started if this is the first look. */
export async function getOrCreateCount(
  date: string,
  location: string,
  enteredBy: string,
): Promise<InventoryCount> {
  const existing = await supabaseAdminLive
    .from("inventory_counts")
    .select("*")
    .eq("count_date", date)
    .eq("location", location)
    .maybeSingle();

  if (existing.data) return normaliseCount(existing.data as Record<string, unknown>);

  const created = await supabaseAdminLive
    .from("inventory_counts")
    .insert([{ reference: await nextCountReference(date), count_date: date, location, entered_by: enteredBy }])
    .select()
    .single();

  /* Two tablets opening the sheet at the same moment both find nothing and both
     insert; the unique index on (count_date, location) lets exactly one win.
     The loser re-reads rather than failing, so they end up on the same sheet —
     which is the entire reason that index is there. */
  if (created.error) {
    const again = await supabaseAdminLive
      .from("inventory_counts")
      .select("*")
      .eq("count_date", date)
      .eq("location", location)
      .maybeSingle();
    if (again.data) return normaliseCount(again.data as Record<string, unknown>);
    throw new Error(created.error.message);
  }

  return normaliseCount(created.data as Record<string, unknown>);
}

/** SC-2026-0906-001 — the day's counts, numbered in the order they started. */
async function nextCountReference(date: string): Promise<string> {
  const { count } = await supabaseAdminLive
    .from("inventory_counts")
    .select("id", { count: "exact", head: true })
    .eq("count_date", date);

  const [y, m, d] = date.split("-");
  return `SC-${y}-${m}${d}-${String((count ?? 0) + 1).padStart(3, "0")}`;
}

/**
 * WO-2026-0041 for a write-off, WST-2026-0043 for waste.
 *
 * Numbered from how many of that kind the year already holds. Two entries saved
 * in the same second could take the same number, which is a cosmetic clash on a
 * document reference rather than a correctness problem — the row's own id is
 * what anything else keys on. A Postgres sequence is the fix if a branch ever
 * gets busy enough for it to matter.
 */
export async function nextDocumentNumber(kind: "writeoff" | "waste", date: string): Promise<string> {
  const year = date.slice(0, 4);
  const { count } = await supabaseAdminLive
    .from("inventory_movements")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .gte("movement_date", `${year}-01-01`)
    .lte("movement_date", `${year}-12-31`);

  const prefix = kind === "writeoff" ? "WO" : "WST";
  return `${prefix}-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

/**
 * Everything the count screen draws, for one date.
 *
 * Two queries carry it: the items, and every movement dated on or before the
 * day. The movements are split in memory rather than by four separate
 * aggregate queries — a beverage store is hundreds of rows a month, and one
 * round trip beats five over café wifi.
 */
export async function buildSheet(opts: {
  date: string;
  location?: string;
  enteredBy?: string;
}): Promise<SheetPayload> {
  const { date, location = "", enteredBy = "" } = opts;

  const [itemsRes, movementsRes, count] = await Promise.all([
    supabaseAdminLive
      .from("inventory_items")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("sort_order")
      .order("name"),
    supabaseAdminLive
      .from("inventory_movements")
      .select("*, item:inventory_items(id, name, uom, category)")
      .lte("movement_date", date)
      .order("created_at", { ascending: true }),
    getOrCreateCount(date, location, enteredBy),
  ]);

  if (itemsRes.error) throw new Error(itemsRes.error.message);
  if (movementsRes.error) throw new Error(movementsRes.error.message);

  const allItems = (itemsRes.data ?? []).map((r) => normaliseItem(r as Record<string, unknown>));
  const items = location ? allItems.filter((i) => i.location === location) : allItems;

  const linesRes = await supabaseAdminLive
    .from("inventory_count_lines")
    .select("item_id, physical_count, note")
    .eq("count_id", count.id);

  const counted = new Map<string, { physical: number | null; note: string }>();
  for (const raw of linesRes.data ?? []) {
    const line = raw as { item_id: string; physical_count: number | string | null; note: string | null };
    counted.set(line.item_id, {
      physical: line.physical_count === null ? null : num(line.physical_count),
      note: line.note ?? "",
    });
  }

  const movements = (movementsRes.data ?? []).map((r) => normaliseMovement(r as Record<string, unknown>));

  /* Opening is the balance of everything strictly before the day; the five
     columns are that day's own rows. One pass, so the ledger is read once
     however many items the branch stocks. */
  const opening = new Map<string, number>();
  const today = new Map<string, Record<MovementKind, number>>();
  const blank = (): Record<MovementKind, number> => ({
    opening: 0, received: 0, consumed: 0, writeoff: 0, waste: 0, count_adjustment: 0,
  });

  for (const m of movements) {
    if (m.movement_date < date) {
      opening.set(m.item_id, (opening.get(m.item_id) ?? 0) + m.quantity * KIND_DIRECTION[m.kind]);
    } else {
      const day = today.get(m.item_id) ?? blank();
      day[m.kind] = (day[m.kind] ?? 0) + m.quantity;
      today.set(m.item_id, day);
    }
  }

  const rows: SheetRow[] = items.map((item) => {
    const day = today.get(item.id) ?? blank();
    const line = counted.get(item.id);
    return {
      item,
      /* A posted count's own adjustment belongs to the day it corrected, so it
         is added into the opening of every later day but never shown as a sixth
         column on its own sheet — the physical count already says what it was.
         Same reason an opening movement lands here rather than in a column. */
      opening: round3((opening.get(item.id) ?? 0) + day.opening + day.count_adjustment),
      received: round3(day.received),
      consumed: round3(day.consumed),
      writeoffs: round3(day.writeoff),
      waste: round3(day.waste),
      physical: line?.physical ?? null,
      note: line?.note ?? "",
    };
  });

  const itemIds = new Set(items.map((i) => i.id));
  const register = movements.filter(
    (m) => m.movement_date === date && (m.kind === "writeoff" || m.kind === "waste") && itemIds.has(m.item_id),
  );

  return { count, rows, register };
}

/**
 * Stock on hand right now, per item, for the valuation screen.
 *
 * Deliberately not "as at a date" — valuation answers what is on the shelf
 * today, and a date-bounded version of the same question is what the count
 * sheet is for.
 */
export async function stockOnHand(): Promise<Map<string, number>> {
  const { data, error } = await supabaseAdminLive
    .from("inventory_movements")
    .select("item_id, kind, quantity");

  if (error) throw new Error(error.message);

  const balances = new Map<string, number>();
  for (const raw of data ?? []) {
    const m = raw as { item_id: string; kind: MovementKind; quantity: number | string };
    const dir = KIND_DIRECTION[m.kind] ?? 1;
    balances.set(m.item_id, (balances.get(m.item_id) ?? 0) + num(m.quantity) * dir);
  }
  balances.forEach((value, id) => balances.set(id, round3(value)));
  return balances;
}
