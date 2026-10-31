/**
 * Placing tables on the floor map. Positions are percentages of the map, so the
 * same layout fits a phone and a desktop.
 */

export type TableShape = "square" | "round" | "long";

export interface MapTable {
  code: string;
  section: string;
  seats: string;
  status?: string;
  pos_x?: number | string | null;
  pos_y?: number | string | null;
  shape?: TableShape | null;
}

export type Placed<T> = T & { x: number; y: number };

/** Keeps a table's centre far enough in that it stays wholly on the map. */
export const clampPosition = (value: number) => Math.min(92, Math.max(8, value));

const COLUMNS = 4;

/**
 * Tables with a saved position keep it. The rest are laid out in rows, area by
 * area, so an unplaced table is never hidden under another one.
 */
export function layoutTables<T extends MapTable>(tables: T[]): Placed<T>[] {
  const unplaced = tables.filter((t) => t.pos_x == null || t.pos_y == null);
  const sections = Array.from(new Set(unplaced.map((t) => t.section)));
  const rowsIn = (s: string) => Math.ceil(unplaced.filter((t) => t.section === s).length / COLUMNS);
  const totalRows = sections.reduce((n, s) => n + rowsIn(s), 0);
  const steps = totalRows - 1 + (sections.length - 1) * 0.4;
  const rowHeight = Math.min(20, steps > 0 ? 76 / steps : 20);

  const auto = new Map<string, { x: number; y: number }>();
  let y = 14;
  for (const section of sections) {
    const inSection = unplaced.filter((t) => t.section === section);
    inSection.forEach((table, i) => {
      auto.set(table.code, {
        x: 14 + (i % COLUMNS) * 24,
        y: y + Math.floor(i / COLUMNS) * rowHeight,
      });
    });
    y += rowsIn(section) * rowHeight + rowHeight * 0.4;
  }

  return tables.map((table) => {
    const spot = auto.get(table.code);
    return {
      ...table,
      x: spot ? spot.x : Number(table.pos_x),
      y: spot ? spot.y : Number(table.pos_y),
    };
  });
}

export interface AreaOutline {
  section: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A dashed outline around each area's tables, as a floor plan would draw it. */
export function areaOutlines(tables: Placed<MapTable>[]): AreaOutline[] {
  const sections = Array.from(new Set(tables.map((t) => t.section).filter(Boolean)));
  return sections.map((section) => {
    const own = tables.filter((t) => t.section === section);
    const left = Math.max(1, Math.min(...own.map((t) => t.x)) - 11);
    const right = Math.min(99, Math.max(...own.map((t) => t.x)) + 11);
    const top = Math.max(1, Math.min(...own.map((t) => t.y)) - 12);
    const bottom = Math.min(99, Math.max(...own.map((t) => t.y)) + 9);
    return { section, left, top, width: right - left, height: bottom - top };
  });
}
