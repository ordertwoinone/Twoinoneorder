'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import { useTableStore } from './useTableStore'
import { TABLES } from './tableData'
import type { ViewMode } from './TableScene'

const TableScene = nextDynamic(() => import('./TableScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
      Loading 3D floor plan…
    </div>
  ),
})

// ══════════════ Icons ══════════════

const I = {
  Pin: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>
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

// ══════════════ Config ══════════════

const STEPS = [
  { label: 'Select Area',     icon: I.Pin   },
  { label: 'Your Details',    icon: I.User  },
  { label: 'Confirm Booking', icon: I.Check },
]

const VIEW_BUTTONS: { key: ViewMode; label: string; icon: () => JSX.Element }[] = [
  { key: '3d',  label: '3D View',   icon: I.Cube   },
  { key: 'top', label: 'Top View',  icon: I.Square },
  { key: '360', label: '360°',      icon: I.Rotate },
]

const LEGEND = [
  { color: '#22C55E', label: 'Available' },
  { color: '#F59E0B', label: 'Limited'   },
  { color: '#EF4444', label: 'Booked'    },
]

const TABLE_PHOTO = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80'

interface DetailsForm {
  name: string
  phone: string
  date: string
  time: string
  guests: string
  notes: string
}

const EMPTY_FORM: DetailsForm = {
  name: '', phone: '', date: '', time: '', guests: '2', notes: '',
}

// ══════════════ Page ══════════════

export default function TableBookingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('3d')
  const [form, setForm] = useState<DetailsForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<DetailsForm>>({})

  const { selectedTable } = useTableStore()
  const selected = TABLES.find((t) => t.id === selectedTable)

  function handleField(key: keyof DetailsForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  function validateForm() {
    const e: Partial<DetailsForm> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.phone.trim()) e.phone = 'Phone is required'
    if (!form.date) e.date = 'Date is required'
    if (!form.time) e.time = 'Time is required'
    if (!form.guests || parseInt(form.guests) < 1) e.guests = 'Enter number of guests'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!selected || !validateForm()) return
    setSubmitting(true)

    const bookingData = {
      table_id: selected.id,
      table_section: selected.section,
      seats: selected.seats,
      min_spend: selected.minSpend,
      guest_name: form.name,
      phone: form.phone,
      date: form.date,
      time: form.time,
      guests: parseInt(form.guests),
      notes: form.notes,
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData))
    }

    router.push('/confirm-booking')
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A1A]" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <main className="max-w-5xl mx-auto px-3 sm:px-4 pb-6">

        {/* Heading */}
        <div className="pt-4 pb-1 text-center">
          <h1 className="text-xl sm:text-2xl font-extrabold">Book a Table</h1>
          <p className="text-[12.5px] text-[#6B7280] mt-0.5">
            {step === 1 ? 'Tap a table on the map below to select it' : 'Fill in your details to complete the booking'}
          </p>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-2xl shadow-sm mt-3 px-3 py-3.5 overflow-x-auto">
          <div className="flex items-center justify-between gap-1 min-w-[360px] sm:min-w-0">
            {STEPS.map((s, i) => {
              const active = i + 1 === step
              const done = i + 1 < step
              return (
                <div key={s.label} className="flex items-center gap-1 flex-1">
                  <div className={`flex items-center gap-2 px-2 py-1 ${active ? 'border-b-2 border-[#E8521A]' : ''}`}>
                    <span className={active ? 'text-[#E8521A]' : done ? 'text-green-500' : 'text-[#9CA3AF]'}>
                      <s.icon />
                    </span>
                    <span className={`text-[12.5px] font-semibold whitespace-nowrap ${active ? 'text-[#E8521A]' : done ? 'text-green-600' : 'text-[#6B7280]'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && <span className="text-[#C5C8CE] mx-auto"><I.Chevron /></span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Step 1: Select Table ── */}
        {step === 1 && (
          <>
            {/* 3D Floor Plan */}
            <div className="relative mt-3 rounded-2xl overflow-hidden bg-[#EDE5D8]" style={{ height: 'min(62vh, 580px)' }}>
              <TableScene viewMode={viewMode} />

              {/* View mode buttons */}
              <div className="absolute left-3 top-3 flex flex-col gap-2 z-10">
                {VIEW_BUTTONS.map(({ key, label, icon: Icon }) => {
                  const active = viewMode === key
                  return (
                    <button
                      key={key}
                      onClick={() => setViewMode(key)}
                      className={`w-[68px] py-2 rounded-xl bg-white shadow-md flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
                        active ? 'text-[#E8521A] ring-1 ring-[#E8521A]/40' : 'text-[#6B7280] hover:text-[#1A1A1A]'
                      }`}
                    >
                      <Icon />
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="absolute right-3 top-3 bg-white rounded-xl shadow-md px-3 py-2.5 space-y-1.5 z-10">
                {LEGEND.map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-[11px] font-medium text-[#374151]">{label}</span>
                  </div>
                ))}
              </div>

              {/* Hint */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[11px] font-medium px-3 py-1 rounded-full z-10 whitespace-nowrap pointer-events-none">
                Drag to rotate · Scroll to zoom · Tap a table to select
              </div>
            </div>

            {/* Selected table card */}
            <div className="bg-white rounded-2xl shadow-sm mt-3 p-3.5 sm:p-4">
              {selected ? (
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={TABLE_PHOTO} alt={`Table ${selected.id}`} loading="lazy" decoding="async" className="w-full sm:w-40 h-32 object-cover rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-extrabold mb-2">Table {selected.id}</h2>
                    <div className="space-y-1.5 text-[13.5px] text-[#374151]">
                      <p className="flex items-center gap-2"><span className="text-[#6B7280]"><I.Users /></span>{selected.seats} Guests</p>
                      <p className="flex items-center gap-2"><span className="text-[#6B7280]"><I.MapPin /></span>{selected.section}</p>
                      <p className="flex items-center gap-2"><I.Star />Best for small groups</p>
                    </div>
                  </div>
                  <div className="sm:border-l sm:border-gray-100 sm:pl-5 flex sm:flex-col items-center sm:items-stretch justify-between gap-3 shrink-0">
                    <div className="text-center sm:text-left sm:bg-gray-50 sm:rounded-xl sm:px-5 sm:py-3">
                      <p className="text-[12px] text-[#6B7280]">Min. Spend</p>
                      <p className="text-lg font-extrabold">AED {selected.minSpend}</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      <span className="text-[12px] font-semibold text-green-700">Selected</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-[15px] font-semibold text-[#6B7280]">Select a table to continue</p>
                  <p className="text-[12.5px] text-[#9CA3AF] mt-1">Tap any available table on the map above</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Step 2: Your Details ── */}
        {step === 2 && selected && (
          <>
            {/* Table summary */}
            <div className="bg-white rounded-2xl shadow-sm mt-3 p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={TABLE_PHOTO} alt="table" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="font-extrabold text-[#1A1A1A]">Table {selected.id}</p>
                <p className="text-[13px] text-[#6B7280]">{selected.section} · {selected.seats} seats</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] text-[#9CA3AF]">Min. Spend</p>
                <p className="font-extrabold text-[#E8521A]">AED {selected.minSpend}</p>
              </div>
            </div>

            {/* Details form */}
            <div className="bg-white rounded-2xl shadow-sm mt-3 p-4 sm:p-5">
              <h2 className="text-[15px] font-extrabold mb-4">Your Details</h2>
              <div className="space-y-4">

                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleField('name', e.target.value)}
                    placeholder="Enter your full name"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleField('phone', e.target.value)}
                    placeholder="+971 50 000 0000"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 ${errors.phone ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {errors.phone && <p className="text-[11px] text-red-500 mt-1">{errors.phone}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Date *</label>
                    <input
                      type="date"
                      value={form.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleField('date', e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 ${errors.date ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    {errors.date && <p className="text-[11px] text-red-500 mt-1">{errors.date}</p>}
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Time *</label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => handleField('time', e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 ${errors.time ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    {errors.time && <p className="text-[11px] text-red-500 mt-1">{errors.time}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Number of Guests *</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={form.guests}
                    onChange={(e) => handleField('guests', e.target.value)}
                    placeholder="2"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 ${errors.guests ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {errors.guests && <p className="text-[11px] text-red-500 mt-1">{errors.guests}</p>}
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Special Requests <span className="font-normal text-[#9CA3AF]">(optional)</span></label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => handleField('notes', e.target.value)}
                    rows={3}
                    placeholder="Allergies, birthday decorations, high chair, etc."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 resize-none"
                  />
                </div>

              </div>
            </div>
          </>
        )}

        {/* ── Bottom Nav: Prev / Next buttons only ── */}
        <div className="flex items-center justify-between gap-3 mt-4">
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shadow-sm ${
                step === 1 ? 'bg-white border border-gray-100 text-[#D1D5DB] cursor-not-allowed' : 'bg-white border border-gray-200 text-[#1A1A1A] hover:bg-gray-50'
              }`}
            >
              <I.ChevronL />
            </button>
            <span className="text-[11px] text-[#6B7280] font-medium">Previous</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            {step === 1 ? (
              <>
                <button
                  disabled={!selected}
                  onClick={() => setStep(2)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shadow-sm ${
                    selected
                      ? 'bg-[#E8521A] text-white hover:bg-[#F97316]'
                      : 'bg-white border border-gray-100 text-[#C5C8CE] cursor-not-allowed'
                  }`}
                >
                  <span className="rotate-180 inline-flex"><I.ChevronL /></span>
                </button>
                <span className="text-[11px] text-[#6B7280] font-medium">Next</span>
              </>
            ) : (
              <>
                <button
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="h-12 px-6 rounded-2xl bg-[#E8521A] text-white font-bold text-sm hover:bg-[#F97316] transition shadow-sm disabled:opacity-60"
                >
                  {submitting ? 'Please wait…' : 'Review Booking'}
                </button>
                <span className="text-[11px] text-[#6B7280] font-medium">Continue</span>
              </>
            )}
          </div>
        </div>

      </main>
    </div>
  )
}
