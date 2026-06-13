// ─────────────────────────────────────────────────────────────
// tableData.ts  —  Table positions mapped from floor-plan.png
// Image: public/floor-plan.png  1448 × 1086 px  (aspect 1.333)
// Formula: x = (px/W - 0.5) * 17.8   z = (py/H - 0.5) * 13.35
// Each table below is placed on an actual table in the render.
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
}

export const PLANE_W = 17.8
export const PLANE_H = 13.35

export const SECTION_TO_AREA: Record<string, AreaKey> = {
  'Outdoor Terrace': 'outdoor',
  'Main Dining Hall': 'indoor',
  'VIP Majlis Area':  'vip',
}

export const TABLES: BookTable[] = [

  // ── Indoor — left-wall column (T1–T4, top → bottom) ────────
  { id: 'T1', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-4.13, 0, -4.82], status: 'available' },
  { id: 'T2', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-4.28, 0, -3.65], status: 'available' },
  { id: 'T3', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-4.40, 0, -2.52], status: 'limited'   },
  { id: 'T4', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-4.81, 0, -0.01], status: 'available' },

  // ── Indoor — center tables (T5 small, T6 below the door) ───
  { id: 'T5', seats: '2', section: 'Main Dining Hall', minSpend: 80,  position: [-2.30, 0, -3.11], status: 'available' },
  { id: 'T6', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-0.22, 0,  0.51], status: 'available' },

  // ── VIP oval dining — right room (R1 upper, R2 lower) ──────
  { id: 'R1', seats: '8–10', section: 'VIP Majlis Area', minSpend: 300, position: [ 1.71, 0, -4.48], status: 'available' },
  { id: 'R2', seats: '8–10', section: 'VIP Majlis Area', minSpend: 300, position: [ 1.83, 0, -2.79], status: 'limited'   },

  // ── Outdoor terrace (O1–O5, left → right) ──────────────────
  { id: 'O1', seats: '4', section: 'Outdoor Terrace', minSpend: 100, position: [-6.03, 0, 3.49], status: 'available' },
  { id: 'O2', seats: '4', section: 'Outdoor Terrace', minSpend: 100, position: [-3.06, 0, 3.98], status: 'available' },
  { id: 'O3', seats: '6', section: 'Outdoor Terrace', minSpend: 150, position: [-0.07, 0, 3.81], status: 'available' },
  { id: 'O4', seats: '4', section: 'Outdoor Terrace', minSpend: 100, position: [ 2.65, 0, 3.37], status: 'available' },
  { id: 'O5', seats: '6', section: 'Outdoor Terrace', minSpend: 150, position: [ 0.85, 0, 5.24], status: 'booked'    },
]

export const STATUS_COLORS: Record<TableStatus, string> = {
  available: '#22C55E',
  limited:   '#F59E0B',
  booked:    '#EF4444',
}

export const SELECTED_COLOR = '#E8521A'
