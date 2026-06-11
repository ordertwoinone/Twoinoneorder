// ─────────────────────────────────────────────────────────────
// useTableStore.ts — Zustand store for /book-table flow
// ─────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { TABLES, AreaKey, TableStatus } from './tableData'

interface BookTableStore {
  // tableId → live status
  tableStatuses: Record<string, TableStatus>
  // currently selected table (null = none)
  selectedTable: string | null
  // active area tab
  activeArea: AreaKey
  // select a table — replaces previous selection
  selectTable: (id: string) => void
  // switch the active area tab
  setArea: (area: AreaKey) => void
  clearSelection: () => void
}

// Initial statuses come straight from the static table data
const initialStatuses: Record<string, TableStatus> = {}
TABLES.forEach((t) => { initialStatuses[t.id] = t.status })

export const useTableStore = create<BookTableStore>((set) => ({
  tableStatuses: initialStatuses,
  selectedTable: null,
  activeArea: 'outdoor',

  selectTable: (id) =>
    set((state) => {
      // booked tables can't be selected
      if (state.tableStatuses[id] === 'booked') return state
      return { selectedTable: id }
    }),

  setArea: (area) => set({ activeArea: area }),

  clearSelection: () => set({ selectedTable: null }),
}))
