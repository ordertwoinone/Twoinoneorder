'use client'
// ─────────────────────────────────────────────────────────────
// TableBookingPage.tsx — Full booking page (Step: Select Area /
// Choose Table). Layout matches the approved UI reference:
// navbar → steps → area tabs → 3D floor plan → table card → bottom nav
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import nextDynamic from 'next/dynamic'
import { useTableStore } from './useTableStore'
import { TABLES, AreaKey } from './tableData'
import type { ViewMode } from './TableScene'

// Three.js can't render on the server — load client-side only
const TableScene = nextDynamic(() => import('./TableScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
      Loading 3D floor plan…
    </div>
  ),
})

// ═══════════════ Inline SVG icons (no external deps) ═════════

const I = {
  Calendar: () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
  ),
  Pin: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>
  ),
  Booth: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 11h18M9 19v-4"/></svg>
  ),
  User: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>
  ),
  Check: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
  ),
  Chevron: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
  ),
  ChevronL: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
  ),
  Umbrella: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2a10 10 0 0 1 10 10H2A10 10 0 0 1 12 2zM12 12v7a2 2 0 0 0 4 0"/></svg>
  ),
  Dining: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 10h18M5 10V8a7 7 0 0 1 14 0v2M12 10v9M8 19h8"/></svg>
  ),
  Crown: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18h18M4 16l-1-9 5.5 4L12 4l3.5 7L21 7l-1 9z"/></svg>
  ),
  Cube: () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8l-9-5-9 5v8l9 5 9-5zM3.3 7.3L12 12l8.7-4.7M12 22V12"/></svg>
  ),
  Square: () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
  ),
  Rotate: () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>
  ),
  Users: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5 6.5-5s6.5 1.5 6.5 5"/><circle cx="17" cy="9" r="2.8"/><path d="M17.5 14.5c2.5.4 4 1.9 4 4.5"/></svg>
  ),
  MapPin: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
  ),
  Star: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>
  ),
}

// ═══════════════ Static config ═══════════════════════════════

const STEPS = [
  { label: 'Select Area',     icon: I.Pin,   active: true },
  { label: 'Choose Table',    icon: I.Booth, active: false },
  { label: 'Your Details',    icon: I.User,  active: false },
  { label: 'Confirm Booking', icon: I.Check, active: false },
]

const AREA_TABS: { key: AreaKey; label: string; icon: () => JSX.Element }[] = [
  { key: 'outdoor', label: 'Outdoor Terrace', icon: I.Umbrella },
  { key: 'indoor',  label: 'Main Dining Hall', icon: I.Dining },
  { key: 'vip',     label: 'VIP Majlis Area',  icon: I.Crown },
]

const VIEW_BUTTONS: { key: ViewMode; label: string; icon: () => JSX.Element }[] = [
  { key: '3d',  label: '3D View',   icon: I.Cube },
  { key: 'top', label: 'Top View',  icon: I.Square },
  { key: '360', label: '360° View', icon: I.Rotate },
]

const LEGEND = [
  { color: '#22C55E', label: 'Available' },
  { color: '#F59E0B', label: 'Limited' },
  { color: '#EF4444', label: 'Booked' },
]

const TABLE_PHOTO = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80'

// ═══════════════ Page component ══════════════════════════════

export default function TableBookingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('3d')
  const { selectedTable, activeArea, setArea } = useTableStore()
  const selected = TABLES.find((t) => t.id === selectedTable)

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A1A]" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Page heading */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 pb-6">
        <div className="pt-4 pb-1 text-center">
          <h1 className="text-xl sm:text-2xl font-extrabold">Book a Table</h1>
          <p className="text-[12.5px] text-[#6B7280] mt-0.5">Pick your area and table on the 3D floor plan</p>
        </div>

        {/* ═══ 2. BOOKING STEPS ═══ */}
        <div className="bg-white rounded-2xl shadow-sm mt-3 px-3 py-3.5 overflow-x-auto">
          <div className="flex items-center justify-between gap-1 min-w-[560px] sm:min-w-0">
            {STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-2 px-2 py-1 ${step.active ? 'border-b-2 border-[#E8521A]' : ''}`}>
                  <span className={step.active ? 'text-[#E8521A]' : 'text-[#9CA3AF]'}><step.icon /></span>
                  <span className={`text-[12.5px] font-semibold whitespace-nowrap ${step.active ? 'text-[#E8521A]' : 'text-[#6B7280]'}`}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && <span className="text-[#C5C8CE] mx-auto"><I.Chevron /></span>}
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 3. AREA TABS ═══ */}
        <div className="grid grid-cols-3 gap-2.5 mt-3">
          {AREA_TABS.map(({ key, label, icon: Icon }) => {
            const active = activeArea === key
            return (
              <button
                key={key}
                onClick={() => setArea(key)}
                className={`flex items-center justify-center gap-2 px-2 py-3 rounded-xl bg-white text-[12.5px] sm:text-sm font-semibold transition border ${
                  active ? 'border-[#E8521A] text-[#E8521A]' : 'border-gray-200 text-[#6B7280] hover:border-gray-300'
                }`}
              >
                <Icon />
                <span className="truncate">{label}</span>
              </button>
            )
          })}
        </div>

        {/* ═══ 4. 3D FLOOR PLAN ═══ */}
        <div className="relative mt-3 rounded-2xl overflow-hidden bg-[#EFE8DA]" style={{ height: 'min(64vh, 620px)' }}>
          <TableScene viewMode={viewMode} />

          {/* View controls — left */}
          <div className="absolute left-3 top-3 flex flex-col gap-2 z-10">
            {VIEW_BUTTONS.map(({ key, label, icon: Icon }) => {
              const active = viewMode === key
              return (
                <button
                  key={key}
                  onClick={() => setViewMode(key)}
                  className={`w-[72px] py-2.5 rounded-xl bg-white shadow-md flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
                    active ? 'text-[#E8521A] ring-1 ring-[#E8521A]/40' : 'text-[#6B7280] hover:text-[#1A1A1A]'
                  }`}
                >
                  <Icon />
                  {label}
                </button>
              )
            })}
          </div>

          {/* Legend — right */}
          <div className="absolute right-3 top-3 bg-white rounded-xl shadow-md px-4 py-3 space-y-2 z-10">
            {LEGEND.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-[12px] font-medium text-[#374151]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 5. SELECTED TABLE CARD ═══ */}
        <div className="bg-white rounded-2xl shadow-sm mt-3 p-3.5 sm:p-4">
          {selected ? (
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              {/* Photo */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={TABLE_PHOTO}
                alt={`Table ${selected.id}`}
                className="w-full sm:w-40 h-32 object-cover rounded-xl shrink-0"
              />

              {/* Details */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-extrabold mb-2">Table {selected.id}</h2>
                <div className="space-y-1.5 text-[13.5px] text-[#374151]">
                  <p className="flex items-center gap-2"><span className="text-[#6B7280]"><I.Users /></span>{selected.seats} Guests</p>
                  <p className="flex items-center gap-2"><span className="text-[#6B7280]"><I.MapPin /></span>{selected.section}</p>
                  <p className="flex items-center gap-2"><I.Star />Best for small groups</p>
                </div>
              </div>

              {/* Min spend + CTA */}
              <div className="sm:border-l sm:border-gray-100 sm:pl-5 flex sm:flex-col items-center sm:items-stretch justify-between gap-3 shrink-0">
                <div className="text-center sm:text-left sm:bg-gray-50 sm:rounded-xl sm:px-5 sm:py-3">
                  <p className="text-[12px] text-[#6B7280]">Min. Spend</p>
                  <p className="text-lg font-extrabold">AED {selected.minSpend}</p>
                </div>
                <button className="px-7 py-3 rounded-full text-white font-bold text-sm bg-[#E8521A] hover:bg-[#F97316] transition shadow-md whitespace-nowrap">
                  Select Table
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-[15px] font-semibold text-[#6B7280]">Select a table to continue</p>
              <p className="text-[12.5px] text-[#9CA3AF] mt-1">Tap any green or amber pin on the floor plan</p>
            </div>
          )}
        </div>

        {/* ═══ 6. BOTTOM NAV BAR ═══ */}
        <div className="flex items-center justify-between gap-3 mt-3">
          {/* Previous */}
          <div className="flex flex-col items-center gap-1">
            <button className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-[#1A1A1A] hover:bg-gray-50 transition">
              <I.ChevronL />
            </button>
            <span className="text-[11px] text-[#6B7280] font-medium">Previous</span>
          </div>

          {/* Center status pill */}
          <div className="flex-1 bg-white rounded-full shadow-sm px-5 py-3 flex items-center justify-center gap-3 max-w-md">
            <span className="text-[#6B7280]"><I.Calendar /></span>
            <div className="text-center leading-tight">
              <p className="text-[13px] font-bold">
                {selected ? `Table ${selected.id} selected` : 'Select a table to continue'}
              </p>
              <p className="text-[11px] text-[#9CA3AF]">
                {selected ? `${selected.section} · AED ${selected.minSpend} min` : 'No table selected'}
              </p>
            </div>
          </div>

          {/* Next */}
          <div className="flex flex-col items-center gap-1">
            <button
              disabled={!selected}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shadow-sm ${
                selected
                  ? 'bg-[#E8521A] text-white hover:bg-[#F97316]'
                  : 'bg-white border border-gray-100 text-[#C5C8CE] cursor-not-allowed'
              }`}
            >
              <span className="rotate-180 inline-flex"><I.ChevronL /></span>
            </button>
            <span className="text-[11px] text-[#6B7280] font-medium">Next</span>
          </div>
        </div>

      </main>
    </div>
  )
}
