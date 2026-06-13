// ─────────────────────────────────────────────────────────────
// tableData.ts — Table config for the /book-table booking flow.
// Tables and positions match the photorealistic floor plan
// render (public/floor-plan.jpg): T1–T5 indoor left wing ·
// R1–R2 VIP oval dining (right) · O1–O5 outdoor terrace.
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
// New render: ~1270×1110 px → aspect ≈ 1.144
export const PLANE_W = 17.8
export const PLANE_H = 15.5

// Maps the section display name to its area tab key
export const SECTION_TO_AREA: Record<string, AreaKey> = {
  'Outdoor Terrace': 'outdoor',
  'Main Dining Hall': 'indoor',
  'VIP Majlis Area': 'vip',
}

// Positions measured from the new render image (normalized px
// coords converted to plane units: x=(nx-0.5)*W, z=(ny-0.5)*H)
export const TABLES: BookTable[] = [
  // ── Indoor main dining — left column ──
  { id: 'T1', seats: '4',    section: 'Main Dining Hall', minSpend: 120, position: [-6.5, 0, -6.5], status: 'available' },
  { id: 'T2', seats: '4',    section: 'Main Dining Hall', minSpend: 120, position: [-6.5, 0, -4.7], status: 'available' },
  { id: 'T3', seats: '4',    section: 'Main Dining Hall', minSpend: 120, position: [-6.7, 0, -2.8], status: 'limited'   },
  { id: 'T4', seats: '4',    section: 'Main Dining Hall', minSpend: 120, position: [-6.8, 0, -1.0], status: 'available' },
  { id: 'T5', seats: '4',    section: 'Main Dining Hall', minSpend: 120, position: [-3.4, 0, -0.3], status: 'available' },
  // ── VIP oval dining — right wing ──
  { id: 'R1', seats: '8–10', section: 'VIP Majlis Area',  minSpend: 300, position: [ 3.5, 0, -6.3], status: 'available' },
  { id: 'R2', seats: '8–10', section: 'VIP Majlis Area',  minSpend: 300, position: [ 3.5, 0, -3.9], status: 'limited'   },
  // ── Outdoor terrace ──
  { id: 'O1', seats: '4',    section: 'Outdoor Terrace',  minSpend: 100, position: [-5.5, 0,  2.7], status: 'available' },
  { id: 'O2', seats: '4',    section: 'Outdoor Terrace',  minSpend: 100, position: [-3.4, 0,  3.5], status: 'available' },
  { id: 'O3', seats: '6',    section: 'Outdoor Terrace',  minSpend: 150, position: [ 0.3, 0,  3.6], status: 'available' },
  { id: 'O4', seats: '4',    section: 'Outdoor Terrace',  minSpend: 100, position: [ 3.7, 0,  3.2], status: 'booked'    },
  { id: 'O5', seats: '6',    section: 'Outdoor Terrace',  minSpend: 150, position: [ 5.6, 0,  4.0], status: 'available' },
]

// Pin colors per status (Selected overrides with orange)
export const STATUS_COLORS: Record<TableStatus, string> = {
  available: '#22C55E',
  limited:   '#F59E0B',
  booked:    '#EF4444',
}

export const SELECTED_COLOR = '#E8521A'
