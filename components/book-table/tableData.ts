// ─────────────────────────────────────────────────────────────
// tableData.ts — Table config for the /book-table booking flow.
// Tables and positions match the photorealistic floor plan
// render (public/floor-plan.jpg): T1–T5, T8 indoor · R1–R2
// private room · O1–O5 outdoor terrace.
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
// Image is 1437×1086 px → aspect ≈ 1.323
export const PLANE_W = 17.8
export const PLANE_H = 13.45

// Maps the section display name to its area tab key
export const SECTION_TO_AREA: Record<string, AreaKey> = {
  'Outdoor Terrace': 'outdoor',
  'Main Dining Hall': 'indoor',
  'VIP Majlis Area': 'vip',
}

// Positions were measured from the render image (normalized px
// coords converted to plane units: x=(nx-0.5)*W, z=(ny-0.5)*H)
export const TABLES: BookTable[] = [
  // ── Indoor dining (left wing of the render) ──
  { id: 'T1', seats: '4',   section: 'Main Dining Hall', minSpend: 120, position: [-3.92, 0, -4.57], status: 'available' },
  { id: 'T2', seats: '4',   section: 'Main Dining Hall', minSpend: 120, position: [-3.92, 0, -3.36], status: 'available' },
  { id: 'T3', seats: '4',   section: 'Main Dining Hall', minSpend: 120, position: [-4.09, 0, -1.95], status: 'limited' },
  { id: 'T4', seats: '4',   section: 'Main Dining Hall', minSpend: 120, position: [-4.72, 0, -0.13], status: 'available' },
  { id: 'T5', seats: '4',   section: 'Main Dining Hall', minSpend: 120, position: [-2.58, 0,  0.61], status: 'available' },
  { id: 'T8', seats: '4',   section: 'Main Dining Hall', minSpend: 120, position: [-0.18, 0,  0.61], status: 'available' },
  // ── Private dining room (top-right) ──
  { id: 'R1', seats: '4–6', section: 'VIP Majlis Area',  minSpend: 250, position: [ 0.98, 0, -4.24], status: 'available' },
  { id: 'R2', seats: '4–6', section: 'VIP Majlis Area',  minSpend: 250, position: [ 2.40, 0, -4.24], status: 'limited' },
  // ── Outdoor terrace (bottom, curved facade) ──
  { id: 'O1', seats: '4',   section: 'Outdoor Terrace',  minSpend: 100, position: [-5.70, 0,  3.36], status: 'available' },
  { id: 'O2', seats: '4',   section: 'Outdoor Terrace',  minSpend: 100, position: [-2.67, 0,  3.70], status: 'available' },
  { id: 'O3', seats: '6',   section: 'Outdoor Terrace',  minSpend: 150, position: [ 0.45, 0,  3.56], status: 'available' },
  { id: 'O4', seats: '4',   section: 'Outdoor Terrace',  minSpend: 100, position: [ 0.98, 0,  5.04], status: 'booked' },
  { id: 'O5', seats: '6',   section: 'Outdoor Terrace',  minSpend: 150, position: [ 3.12, 0,  4.17], status: 'available' },
]

// Pin colors per status (Selected overrides with orange)
export const STATUS_COLORS: Record<TableStatus, string> = {
  available: '#22C55E',
  limited:   '#F59E0B',
  booked:    '#EF4444',
}

export const SELECTED_COLOR = '#E8521A'
