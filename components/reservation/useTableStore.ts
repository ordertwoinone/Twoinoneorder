// ─────────────────────────────────────────────────────────────
// useTableStore.ts — Zustand store for table selection state
// ─────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { TABLES, DEFAULT_UNAVAILABLE, TableStatus } from './tableData'

interface TableStore {
  // Map of tableId → status
  tableStatuses: Record<string, TableStatus>
  // Currently selected table id (null if none)
  selectedTable: string | null
  // Select a table; deselects the previous one
  selectTable: (id: string) => void
  // Clear current selection
  clearSelection: () => void
}

// Build initial statuses: all available except DEFAULT_UNAVAILABLE
const initialStatuses: Record<string, TableStatus> = {}
TABLES.forEach(({ id }) => {
  initialStatuses[id] = DEFAULT_UNAVAILABLE.includes(id) ? 'unavailable' : 'available'
})

export const useTableStore = create<TableStore>((set) => ({
  tableStatuses: initialStatuses,
  selectedTable: null,

  selectTable: (id) =>
    set((state) => {
      const prev = state.selectedTable
      const next: Record<string, TableStatus> = { ...state.tableStatuses }

      // Restore previous selection back to available
      if (prev && prev !== id) next[prev] = 'available'

      // Mark new selection
      next[id] = 'selected'

      return { tableStatuses: next, selectedTable: id }
    }),

  clearSelection: () =>
    set((state) => {
      if (!state.selectedTable) return state
      return {
        tableStatuses: {
          ...state.tableStatuses,
          [state.selectedTable]: 'available',
        },
        selectedTable: null,
      }
    }),
}))
