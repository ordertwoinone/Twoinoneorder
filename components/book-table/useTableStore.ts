// ─────────────────────────────────────────────────────────────
// useTableStore.ts — Zustand store for /book-table flow
// ─────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { TABLES, AreaKey, BookTable, TableStatus } from './tableData'

interface BookTableStore {
  // tableId → live status
  tableStatuses: Record<string, TableStatus>
  // every table the guest has picked, in the order they picked them
  selectedTables: string[]
  // active area tab
  activeArea: AreaKey
  // add or remove a table from the selection
  toggleTable: (id: string) => void
  // replace the statuses with the ones admin has set
  syncTables: (tables: BookTable[]) => void
  // switch the active area tab
  setArea: (area: AreaKey) => void
  clearSelection: () => void
}

function statusesOf(tables: BookTable[]): Record<string, TableStatus> {
  const map: Record<string, TableStatus> = {}
  tables.forEach((t) => { map[t.id] = t.status })
  return map
}

export const useTableStore = create<BookTableStore>((set) => ({
  // Replaced by syncTables as soon as the page has the admin rows.
  tableStatuses: statusesOf(TABLES),
  selectedTables: [],
  activeArea: 'outdoor',

  toggleTable: (id) =>
    set((state) => {
      // booked tables can't be selected
      if (state.tableStatuses[id] === 'booked') return state
      return {
        selectedTables: state.selectedTables.includes(id)
          ? state.selectedTables.filter((t) => t !== id)
          : [...state.selectedTables, id],
      }
    }),

  syncTables: (tables) =>
    set((state) => {
      const tableStatuses = statusesOf(tables)
      // A table that has since been booked or removed cannot stay selected.
      const selectedTables = state.selectedTables.filter(
        (id) => tableStatuses[id] && tableStatuses[id] !== 'booked',
      )
      return { tableStatuses, selectedTables }
    }),

  setArea: (area) => set({ activeArea: area }),

  clearSelection: () => set({ selectedTables: [] }),
}))
