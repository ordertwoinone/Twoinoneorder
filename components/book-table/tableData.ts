// ─────────────────────────────────────────────────────────────
// tableData.ts  —  Table positions remapped from floor-plan.png
// Image: public/floor-plan.png  1448 × 1086 px
// Formula: x = (px/1448 - 0.5) * 17.8
//          z = (py/1086 - 0.5) * 13.35
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

  // ── Indoor left-wall column (T1–T4, top → bottom) ──────────
  // px ≈ 224, 212, 203, 198  |  py ≈ 138, 261, 391, 517
  { id: 'T1', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-5.05, 0, -5.00], status: 'available' },
  { id: 'T2', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-5.15, 0, -3.45], status: 'available' },
  { id: 'T3', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-5.27, 0, -1.90], status: 'limited'   },
  { id: 'T4', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-5.33, 0, -0.40], status: 'available' },

  // ── Indoor center 2×2 cluster around coffee counter ────────
  // px ≈ 374, 495  |  py ≈ 265, 391
  { id: 'T5', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-2.85, 0, -3.45], status: 'available' },
  { id: 'T6', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-1.35, 0, -3.45], status: 'available' },
  { id: 'T7', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-2.85, 0, -1.90], status: 'available' },
  { id: 'T8', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-1.35, 0, -1.90], status: 'available' },

  // ── VIP oval dining — right wing ───────────────────────────
  // px ≈ 857, 864  |  py ≈ 174, 314
  { id: 'R1', seats: '8–10', section: 'VIP Majlis Area', minSpend: 300, position: [ 2.44, 0, -4.80], status: 'available' },
  { id: 'R2', seats: '8–10', section: 'VIP Majlis Area', minSpend: 300, position: [ 2.53, 0, -3.00], status: 'limited'   },

  // ── Outdoor terrace (O1–O5, left → right) ──────────────────
  // px ≈ 162, 393, 622, 881, 1111  |  py ≈ 736, 773, 778, 763, 741
  { id: 'O1', seats: '4', section: 'Outdoor Terrace', minSpend: 100, position: [-6.90, 0, 2.44], status: 'available' },
  { id: 'O2', seats: '4', section: 'Outdoor Terrace', minSpend: 100, position: [-4.05, 0, 2.93], status: 'available' },
  { id: 'O3', seats: '6', section: 'Outdoor Terrace', minSpend: 150, position: [-0.90, 0, 3.00], status: 'available' },
  { id: 'O4', seats: '4', section: 'Outdoor Terrace', minSpend: 100, position: [ 1.94, 0, 2.80], status: 'booked'    },
  { id: 'O5', seats: '6', section: 'Outdoor Terrace', minSpend: 150, position: [ 4.75, 0, 2.50], status: 'available' },
]

export const STATUS_COLORS: Record<TableStatus, string> = {
  available: '#22C55E',
  limited:   '#F59E0B',
  booked:    '#EF4444',
}

export const SELECTED_COLOR = '#E8521A'
