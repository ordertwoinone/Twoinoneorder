'use client'
// ─────────────────────────────────────────────────────────────
// TableBookingPage.tsx — Main reservation flow, Step 1
// Canvas + HTML overlays + framer-motion step transition
// ─────────────────────────────────────────────────────────────

import { useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { AnimatePresence, motion } from 'framer-motion'
import { useTableStore } from './useTableStore'
import { TableScene, ActiveFilter } from './TableScene'
import { TABLES } from './tableData'

interface Props {
  /** Called when user confirms table and moves to Step 2 externally */
  onTableSelected?: (tableId: string) => void
}

// ── Section filter tab labels ─────────────────────────────────
const FILTERS: ActiveFilter[] = ['All', 'Indoor', 'Outdoor']

// ── Inline styles (avoids Tailwind dependency for isolation) ──
const S = {
  root: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    position: 'relative' as const,
    background: '#1A120A',
    fontFamily: 'system-ui, -apple-system, Inter, sans-serif',
  },
  topBar: {
    position: 'absolute' as const,
    top: 0, left: 0, right: 0,
    padding: '14px 20px',
    background: 'linear-gradient(to bottom, rgba(20,12,6,0.9) 0%, transparent 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap' as const,
    zIndex: 10,
  },
  sideCard: {
    position: 'absolute' as const,
    bottom: 24,
    right: 20,
    width: 248,
    background: 'rgba(20, 12, 6, 0.75)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(245,240,232,0.13)',
    borderRadius: 18,
    padding: '18px 20px',
    zIndex: 10,
  },
}

// ── Step 2 placeholder ───────────────────────────────────────
function Step2({ tableId, onBack }: { tableId: string; onBack: () => void }) {
  const table = TABLES.find((t) => t.id === tableId)
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 30% 40%, #2D1F12 0%, #1A120A 100%)',
    }}>
      <div style={{
        background: 'rgba(245,240,232,0.06)',
        backdropFilter: 'blur(18px)',
        border: '1px solid rgba(245,240,232,0.14)',
        borderRadius: 22,
        padding: '44px 52px',
        maxWidth: 480,
        width: '90%',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          width: 62, height: 62, borderRadius: '50%',
          background: 'linear-gradient(135deg, #F5A623 0%, #E8860F 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 22px', fontSize: 26,
        }}>✓</div>

        <h2 style={{ color: '#F5F0E8', margin: '0 0 6px', fontSize: '1.55rem', fontWeight: 800 }}>
          Table {tableId} Reserved
        </h2>
        <p style={{ color: '#C0AA90', margin: '0 0 6px', fontSize: '0.9rem' }}>
          {table?.section} Dining · {table?.seats} seats
        </p>
        <p style={{ color: '#7A6A5A', fontSize: '0.82rem', margin: '0 0 30px' }}>
          Step 2 — Date, time &amp; guest details form goes here
        </p>

        {/* Placeholder form fields */}
        {['Date', 'Time', 'Guests'].map((label) => (
          <div key={label} style={{ marginBottom: 12, textAlign: 'left' }}>
            <label style={{ color: '#B0A090', fontSize: '0.78rem', display: 'block', marginBottom: 4 }}>
              {label}
            </label>
            <div style={{
              background: 'rgba(245,240,232,0.08)',
              border: '1px solid rgba(245,240,232,0.12)',
              borderRadius: 9,
              padding: '10px 14px',
              color: '#7A6A5A',
              fontSize: '0.85rem',
            }}>
              Select {label.toLowerCase()}…
            </div>
          </div>
        ))}

        <button
          onClick={onBack}
          style={{
            marginTop: 18,
            padding: '10px 26px',
            borderRadius: 11,
            border: '1px solid rgba(245,240,232,0.2)',
            background: 'transparent',
            color: '#F5F0E8',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          ← Change Table
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function TableBookingPage({ onTableSelected }: Props) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('All')
  const [step, setStep] = useState<1 | 2>(1)

  const { selectedTable, clearSelection } = useTableStore()
  const selectedData = TABLES.find((t) => t.id === selectedTable)

  function handleContinue() {
    if (!selectedTable) return
    if (onTableSelected) {
      onTableSelected(selectedTable)
    } else {
      setStep(2)
    }
  }

  function handleBack() {
    clearSelection()
    setStep(1)
  }

  return (
    <div style={S.root}>
      <AnimatePresence mode="wait">

        {/* ══ STEP 1 — 3D Table picker ══ */}
        {step === 1 && (
          <motion.div
            key="step1"
            style={{ position: 'absolute', inset: 0 }}
            initial={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ duration: 0.48, ease: 'easeInOut' }}
          >
            {/* ─── 3D Canvas ─── */}
            <Canvas
              shadows
              camera={{ position: [0, 22, 27], fov: 48 }}
              style={{ width: '100%', height: '100%' }}
              gl={{ antialias: true }}
            >
              <Suspense fallback={null}>
                <TableScene activeFilter={activeFilter} />
              </Suspense>
            </Canvas>

            {/* ─── Top bar overlay ─── */}
            <div style={S.topBar}>
              {/* Heading */}
              <div>
                <h1 style={{ color: '#F5F0E8', fontWeight: 800, fontSize: '1.25rem', margin: 0, lineHeight: 1.2 }}>
                  Select Your Table
                </h1>
                <p style={{ color: '#A09080', fontSize: '0.75rem', margin: '3px 0 0' }}>
                  Tap a table on the map to select it
                </p>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                {[
                  { color: '#8B5E3C', label: 'Available' },
                  { color: '#F5A623', label: 'Selected' },
                  { color: '#888',    label: 'Unavailable' },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ color: '#C0B0A0', fontSize: '0.72rem', fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Section filter tabs */}
              <div style={{ display: 'flex', gap: 5, background: 'rgba(0,0,0,0.3)', padding: '4px 5px', borderRadius: 24 }}>
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 18,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: activeFilter === f ? '#F5A623' : 'transparent',
                      color:      activeFilter === f ? '#1A120A' : '#C0B0A0',
                      transition: 'all 0.18s',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Sidebar info card ─── */}
            <div style={S.sideCard}>
              {selectedData ? (
                <>
                  {/* Table identity row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #F5A623 0%, #E8860F 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, color: '#1A120A', fontSize: '0.88rem', flexShrink: 0,
                    }}>
                      {selectedData.id}
                    </div>
                    <div>
                      <div style={{ color: '#F5F0E8', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
                        Table {selectedData.id}
                      </div>
                      <div style={{ color: '#A09080', fontSize: '0.73rem', marginTop: 1 }}>
                        {selectedData.section} Dining
                      </div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <div style={{
                      flex: 1, background: 'rgba(245,240,232,0.07)', borderRadius: 10,
                      padding: '9px 10px', textAlign: 'center',
                    }}>
                      <div style={{ color: '#F5A623', fontWeight: 800, fontSize: '1.2rem' }}>
                        {selectedData.seats}
                      </div>
                      <div style={{ color: '#A09080', fontSize: '0.68rem', marginTop: 1 }}>Seats</div>
                    </div>
                    <div style={{
                      flex: 1, background: 'rgba(245,240,232,0.07)', borderRadius: 10,
                      padding: '9px 10px', textAlign: 'center',
                    }}>
                      <div style={{ color: '#6B8F5E', fontWeight: 800, fontSize: '1rem' }}>●</div>
                      <div style={{ color: '#A09080', fontSize: '0.68rem', marginTop: 1 }}>Available</div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px 0 14px' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🍽️</div>
                  <div style={{ color: '#C0B0A0', fontSize: '0.88rem', fontWeight: 600, marginBottom: 4 }}>
                    No table selected
                  </div>
                  <div style={{ color: '#6A5A4A', fontSize: '0.74rem' }}>
                    Click a table on the map
                  </div>
                </div>
              )}

              {/* Continue button */}
              <button
                onClick={handleContinue}
                disabled={!selectedTable}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  borderRadius: 11,
                  border: 'none',
                  cursor: selectedTable ? 'pointer' : 'not-allowed',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  background: selectedTable
                    ? 'linear-gradient(135deg, #F5A623 0%, #E8860F 100%)'
                    : 'rgba(245,240,232,0.1)',
                  color: selectedTable ? '#1A120A' : '#6A5A4A',
                  transition: 'all 0.2s',
                  boxShadow: selectedTable ? '0 4px 16px rgba(245,166,35,0.35)' : 'none',
                }}
              >
                {selectedTable ? 'Continue to Booking →' : 'Select a Table First'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ══ STEP 2 — Booking form ══ */}
        {step === 2 && (
          <motion.div
            key="step2"
            style={{ position: 'absolute', inset: 0 }}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0,      opacity: 1 }}
            transition={{ duration: 0.48, ease: 'easeInOut' }}
          >
            <Step2 tableId={selectedTable!} onBack={handleBack} />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
