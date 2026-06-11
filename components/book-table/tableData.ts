// ─────────────────────────────────────────────────────────────
// tableData.ts — Table config for the /book-table booking flow
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

// Maps the section display name to its area tab key
export const SECTION_TO_AREA: Record<string, AreaKey> = {
  'Outdoor Terrace': 'outdoor',
  'Main Dining Hall': 'indoor',
  'VIP Majlis Area': 'vip',
}

export const TABLES: BookTable[] = [
  // ── Outdoor Terrace ──
  { id: 'T01', seats: '2–4', section: 'Outdoor Terrace',  minSpend: 100, position: [-5,   0,  7],   status: 'available' },
  { id: 'T02', seats: '2–4', section: 'Outdoor Terrace',  minSpend: 100, position: [-2,   0,  8],   status: 'available' },
  { id: 'T03', seats: '4–6', section: 'Outdoor Terrace',  minSpend: 150, position: [ 1,   0,  8],   status: 'available' },
  { id: 'T04', seats: '4–6', section: 'Outdoor Terrace',  minSpend: 150, position: [ 4,   0,  7],   status: 'booked' },
  { id: 'O1',  seats: '4',   section: 'Outdoor Terrace',  minSpend: 100, position: [-7.5, 0,  9.5], status: 'available' },
  { id: 'O2',  seats: '4',   section: 'Outdoor Terrace',  minSpend: 100, position: [-3.5, 0, 10.5], status: 'available' },
  { id: 'O3',  seats: '6',   section: 'Outdoor Terrace',  minSpend: 150, position: [ 0,   0, 11],   status: 'available' },
  { id: 'O4',  seats: '4',   section: 'Outdoor Terrace',  minSpend: 100, position: [ 3.5, 0, 10.5], status: 'booked' },
  { id: 'O5',  seats: '6',   section: 'Outdoor Terrace',  minSpend: 150, position: [ 6.5, 0,  9.5], status: 'available' },
  // ── Main Dining Hall ──
  { id: 'T05', seats: '2–4', section: 'Main Dining Hall', minSpend: 120, position: [-3,   0,  1],   status: 'available' },
  { id: 'T06', seats: '4–6', section: 'Main Dining Hall', minSpend: 150, position: [ 0,   0, -1],   status: 'available' },
  { id: 'T07', seats: '2–4', section: 'Main Dining Hall', minSpend: 120, position: [-2,   0,  3],   status: 'limited' },
  { id: 'T08', seats: '4–6', section: 'Main Dining Hall', minSpend: 150, position: [ 1,   0,  1.5], status: 'available' },
  { id: 'T09', seats: '4–8', section: 'VIP Majlis Area',  minSpend: 300, position: [ 4,   0, -0.5], status: 'available' },
  { id: 'T10', seats: '4–8', section: 'VIP Majlis Area',  minSpend: 300, position: [ 5.5, 0,  1.5], status: 'available' },
  // ── VIP Majlis (private room, top-right) ──
  { id: 'R1',  seats: '4–6', section: 'VIP Majlis Area',  minSpend: 200, position: [ 3.5, 0, -4.5], status: 'available' },
  { id: 'R2',  seats: '4–6', section: 'VIP Majlis Area',  minSpend: 200, position: [ 5.8, 0, -4.5], status: 'limited' },
]

// Pin colors per status (Selected overrides with orange)
export const STATUS_COLORS: Record<TableStatus, string> = {
  available: '#22C55E',
  limited:   '#F59E0B',
  booked:    '#EF4444',
}

export const SELECTED_COLOR = '#E8521A'
