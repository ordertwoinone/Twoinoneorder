// ─────────────────────────────────────────────────────────────
// tableData.ts — Static table configuration for the floor plan
// ─────────────────────────────────────────────────────────────

export type TableSection = 'Indoor' | 'Private' | 'Outdoor'
export type TableStatus = 'available' | 'unavailable' | 'selected'

export interface TableData {
  id: string
  seats: number
  section: TableSection
  position: [number, number, number]
}

export const TABLES: TableData[] = [
  // ── Indoor main dining ──
  { id: 'T1', seats: 4, section: 'Indoor',  position: [-4,   0, -3]   },
  { id: 'T2', seats: 4, section: 'Indoor',  position: [-4,   0, -1]   },
  { id: 'T3', seats: 4, section: 'Indoor',  position: [-4,   0,  1]   },
  { id: 'T4', seats: 4, section: 'Indoor',  position: [-2,   0,  2]   },
  { id: 'T5', seats: 4, section: 'Indoor',  position: [ 0,   0,  3]   },
  { id: 'T8', seats: 4, section: 'Indoor',  position: [ 2,   0,  3]   },
  // ── Private dining room (top-right) ──
  { id: 'R1', seats: 6, section: 'Private', position: [ 3.5, 0, -3]   },
  { id: 'R2', seats: 6, section: 'Private', position: [ 5,   0, -3]   },
  // ── Outdoor terrace ──
  { id: 'O1', seats: 4, section: 'Outdoor', position: [-5,   0,  7]   },
  { id: 'O2', seats: 4, section: 'Outdoor', position: [-2,   0,  8]   },
  { id: 'O3', seats: 6, section: 'Outdoor', position: [ 1,   0,  8]   },
  { id: 'O4', seats: 4, section: 'Outdoor', position: [ 1,   0, 10]   },
  { id: 'O5', seats: 6, section: 'Outdoor', position: [ 4,   0,  7.5] },
]

// Tables that are pre-set as unavailable (demo)
export const DEFAULT_UNAVAILABLE = ['T3', 'O2']
