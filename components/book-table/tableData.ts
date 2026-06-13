// ─────────────────────────────────────────────────────────────
// tableData.ts — Table config for the /book-table booking flow.
// 15 tables: T1–T8 indoor · R1–R2 VIP oval · O1–O5 outdoor.
// Image: public/floor-plan.png  1448×1086 px
// Formula: x=(px/1448-0.5)*17.8  z=(py/1086-0.5)*13.35
// ─────────────────────────────────────────────────────────────

export type TableStatus = 'available' | 'limited' | 'booked'
export type AreaKey = 'outdoor' | 'indoor' | 'vip'

export interface BookTable {
  id: string
  seats: string
  section: string
  minSpend: number
  /** World position on the floor-plan plane (x, y, z) */
  position: [number, number, number]
  status: TableStatus
}

// Floor-plan image plane dimensions in world units.
// New render: 1448×1086 px → aspect ≈ 1.333 → PLANE_H = 17.8/1.333
export const PLANE_W = 17.8
export const PLANE_H = 13.35

// Maps the section display name to its area tab key
export const SECTION_TO_AREA: Record<string, AreaKey> = {
  'Outdoor Terrace': 'outdoor',
  'Main Dining Hall': 'indoor',
  'VIP Majlis Area': 'vip',
}

export const TABLES: BookTable[] = [
  // ── Indoor main dining — left column (T1–T4) ──
  { id: 'T1', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-6.1, 0, -5.0], status: 'available' },
  { id: 'T2', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-6.1, 0, -3.3], status: 'available' },
  { id: 'T3', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-6.1, 0, -1.7], status: 'limited'   },
  { id: 'T4', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-5.9, 0, -0.4], status: 'available' },
  // ── Indoor center area (T5–T8, 2×2 around coffee counter) ──
  { id: 'T5', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-3.5, 0, -0.5], status: 'available' },
  { id: 'T6', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-2.2, 0, -0.5], status: 'available' },
  { id: 'T7', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-3.5, 0, -1.8], status: 'available' },
  { id: 'T8', seats: '4', section: 'Main Dining Hall', minSpend: 120, position: [-2.2, 0, -1.8], status: 'available' },
  // ── VIP oval dining — right wing ──
  { id: 'R1', seats: '8–10', section: 'VIP Majlis Area', minSpend: 300, position: [ 2.1, 0, -4.3], status: 'available' },
  { id: 'R2', seats: '8–10', section: 'VIP Majlis Area', minSpend: 300, position: [ 2.0, 0, -2.4], status: 'limited'   },
  // ── Outdoor terrace (O1–O5) — z boosted to account for 3D perspective compression ──
  { id: 'O1', seats: '4', section: 'Outdoor Terrace', minSpend: 100, position: [-6.5, 0, 3.8], status: 'available' },
  { id: 'O2', seats: '4', section: 'Outdoor Terrace', minSpend: 100, position: [-3.6, 0, 4.3], status: 'available' },
  { id: 'O3', seats: '6', section: 'Outdoor Terrace', minSpend: 150, position: [-0.7, 0, 4.4], status: 'available' },
  { id: 'O4', seats: '4', section: 'Outdoor Terrace', minSpend: 100, position: [ 2.3, 0, 4.0], status: 'booked'    },
  { id: 'O5', seats: '6', section: 'Outdoor Terrace', minSpend: 150, position: [ 4.8, 0, 3.8], status: 'available' },
]

// Pin colors per status (Selected overrides with orange)
export const STATUS_COLORS: Record<TableStatus, string> = {
  available: '#22C55E',
  limited:   '#F59E0B',
  booked:    '#EF4444',
}

export const SELECTED_COLOR = '#E8521A'
