'use client'

import { useTableStore } from './useTableStore'
import { TABLES, STATUS_COLORS, SELECTED_COLOR, type TableStatus } from './tableData'

const STATUS_LABEL: Record<TableStatus, string> = {
  available: 'Available',
  limited:   'Limited',
  booked:    'Booked',
}

interface TableTileProps {
  id: string
  seats: string
  status: TableStatus
  isSelected: boolean
  onClick: () => void
}

function TableTile({ id, seats, status, isSelected, onClick }: TableTileProps) {
  const booked = status === 'booked'
  const color = isSelected ? SELECTED_COLOR : STATUS_COLORS[status]

  return (
    <button
      onClick={() => !booked && onClick()}
      disabled={booked}
      title={`${id} · ${seats} seats · ${STATUS_LABEL[status]}`}
      className="relative flex flex-col items-center justify-center rounded-2xl border-2 transition-all duration-200 select-none"
      style={{
        width: 72,
        height: 72,
        borderColor: isSelected ? SELECTED_COLOR : booked ? '#EF4444' : color,
        background: isSelected
          ? `${SELECTED_COLOR}18`
          : booked
          ? '#FEF2F2'
          : status === 'limited'
          ? '#FFFBEB'
          : '#F0FDF4',
        cursor: booked ? 'not-allowed' : 'pointer',
        boxShadow: isSelected ? `0 0 0 3px ${SELECTED_COLOR}40` : undefined,
        transform: isSelected ? 'scale(1.08)' : undefined,
      }}
    >
      {/* Chair dots — top */}
      <span className="absolute top-1.5 left-1/2 -translate-x-1/2 flex gap-1">
        <span className="w-2 h-2 rounded-full border-2" style={{ borderColor: color }} />
        <span className="w-2 h-2 rounded-full border-2" style={{ borderColor: color }} />
      </span>

      {/* Table ID */}
      <span className="font-extrabold text-[15px] leading-none" style={{ color: isSelected ? SELECTED_COLOR : '#1A1A1A' }}>
        {id}
      </span>
      {/* Seat count */}
      <span className="text-[10px] font-semibold mt-0.5" style={{ color }}>
        {seats}p
      </span>

      {/* Chair dots — bottom */}
      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
        <span className="w-2 h-2 rounded-full border-2" style={{ borderColor: color }} />
        <span className="w-2 h-2 rounded-full border-2" style={{ borderColor: color }} />
      </span>

      {/* Booked X overlay */}
      {booked && (
        <span className="absolute inset-0 flex items-center justify-center text-red-400 text-lg font-black opacity-30">
          ✕
        </span>
      )}
    </button>
  )
}

// ─────────── Zone wrapper ───────────────────────────────────────

function Zone({
  label,
  emoji,
  ids,
  columns = 4,
}: {
  label: string
  emoji: string
  ids: string[]
  columns?: number
}) {
  const { tableStatuses, selectedTable, selectTable } = useTableStore()
  const tables = TABLES.filter((t) => ids.includes(t.id))

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <span className="text-[13px] font-bold text-gray-700 uppercase tracking-wide">{label}</span>
      </div>

      <div
        className="flex flex-wrap gap-3"
        style={{ gridTemplateColumns: `repeat(${columns}, 72px)` }}
      >
        {tables.map((t) => (
          <TableTile
            key={t.id}
            id={t.id}
            seats={t.seats}
            status={tableStatuses[t.id]}
            isSelected={selectedTable === t.id}
            onClick={() => selectTable(t.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────── Legend ─────────────────────────────────────────────

const LEGEND = [
  { color: STATUS_COLORS.available, label: 'Available' },
  { color: STATUS_COLORS.limited,   label: 'Limited'   },
  { color: STATUS_COLORS.booked,    label: 'Booked'    },
  { color: SELECTED_COLOR,          label: 'Selected'  },
]

// ─────────── Exported map ───────────────────────────────────────

export default function TableMap() {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-[#F5F0E8] p-4 space-y-3">

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {LEGEND.map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[12px] font-medium text-gray-600">
            <span className="w-3 h-3 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      {/* Zones */}
      <Zone label="Outdoor Terrace"  emoji="☀️" ids={['O1','O2','O3','O4','O5']} columns={5} />
      <Zone label="Main Dining Hall" emoji="🍽️" ids={['T1','T2','T3','T4','T5','T6','T7','T8']} columns={4} />
      <Zone label="VIP Majlis Area"  emoji="👑" ids={['R1','R2']} columns={2} />

    </div>
  )
}
