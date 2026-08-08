// ─────────────────────────────────────────────────────────────
// tableData.ts  —  Table positions mapped from floor-plan.png
// Image: public/floor-plan.png  1448 × 1086 px  (aspect 1.333)
// Formula: x = (px/W - 0.5) * 17.8   z = (py/H - 0.5) * 13.35
// Each table below is placed on an actual table in the render.
//
// These are the fallback shapes only. What the page actually shows comes from
// the booking_tables table (admin → Book a Table); see supabase/booking_tables.sql.
// ─────────────────────────────────────────────────────────────

export type TableStatus = 'available' | 'limited' | 'booked'
export type AreaKey = 'outdoor' | 'indoor' | 'vip'

export interface BookTable {
  id: string
  seats: string
  section: string
  minSpend: number
  position: [number, number, number]
  status: TableStatus
  /** Admin-managed detail shown on the selected-table card. */
  imageUrl: string
  description: string
  descriptionAr: string
}

/** A booking_tables row as it comes back from Supabase. */
export interface BookingTableRow {
  code: string
  section: string
  seats: string
  min_spend: number | string | null
  status: string | null
  image_url: string | null
  description: string | null
  description_ar: string | null
  pos_x: number | string | null
  pos_z: number | string | null
}

export const PLANE_W = 17.8
export const PLANE_H = 13.35

export const SECTION_TO_AREA: Record<string, AreaKey> = {
  'Outdoor Terrace': 'outdoor',
  'Main Dining Hall': 'indoor',
  'VIP Majlis Area':  'vip',
}

const STATUSES: TableStatus[] = ['available', 'limited', 'booked']

function num(value: number | string | null | undefined): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  return Number.isFinite(n) ? n : 0
}

/** A row typed in admin, in the shape the floor plan and the details card want. */
export function toBookTable(row: BookingTableRow): BookTable {
  const status = STATUSES.includes(row.status as TableStatus)
    ? (row.status as TableStatus)
    : 'available'

  return {
    id: row.code,
    seats: row.seats || '',
    section: row.section || '',
    minSpend: num(row.min_spend),
    position: [num(row.pos_x), 0, num(row.pos_z)],
    status,
    imageUrl: row.image_url || '',
    description: row.description || '',
    descriptionAr: row.description_ar || '',
  }
}

const seed = (
  id: string,
  seats: string,
  section: string,
  minSpend: number,
  position: [number, number, number],
): BookTable => ({
  id, seats, section, minSpend, position,
  status: 'available', imageUrl: '', description: '', descriptionAr: '',
})

/** Used until booking_tables is populated — the layout as originally drawn. */
export const TABLES: BookTable[] = [

  // ── Indoor — left-wall column (T1–T4, top → bottom) ────────
  seed('T1', '4', 'Main Dining Hall', 120, [-4.13, 0, -4.82]),
  seed('T2', '4', 'Main Dining Hall', 120, [-4.28, 0, -3.65]),
  seed('T3', '4', 'Main Dining Hall', 120, [-4.40, 0, -2.52]),
  seed('T4', '4', 'Main Dining Hall', 120, [-4.81, 0, -0.01]),

  // ── Indoor — center tables (T5 small, T6 below the door) ───
  seed('T5', '2', 'Main Dining Hall',  80, [-2.30, 0, -3.11]),
  seed('T6', '4', 'Main Dining Hall', 120, [-0.22, 0,  0.51]),

  // ── VIP oval dining — right room (R1 upper, R2 lower) ──────
  seed('R1', '8–10', 'VIP Majlis Area', 300, [ 1.71, 0, -4.48]),
  seed('R2', '8–10', 'VIP Majlis Area', 300, [ 1.83, 0, -2.79]),

  // ── Outdoor terrace (O1–O5, left → right) ──────────────────
  seed('O1', '4', 'Outdoor Terrace', 100, [-6.03, 0, 3.49]),
  seed('O2', '4', 'Outdoor Terrace', 100, [-3.06, 0, 3.98]),
  seed('O3', '6', 'Outdoor Terrace', 150, [-0.07, 0, 3.81]),
  seed('O4', '4', 'Outdoor Terrace', 100, [ 2.65, 0, 3.37]),
  seed('O5', '6', 'Outdoor Terrace', 150, [ 0.85, 0, 5.24]),
]

export const STATUS_COLORS: Record<TableStatus, string> = {
  available: '#22C55E',
  limited:   '#F59E0B',
  booked:    '#EF4444',
}

export const SELECTED_COLOR = '#E8521A'
