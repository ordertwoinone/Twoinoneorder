'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const WHATSAPP = '971501234567'

interface PendingBooking {
  table_id: string
  table_section: string
  seats: string
  min_spend: number
  guest_name: string
  phone: string
  date: string
  time: string
  guests: number
  notes: string
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTime(timeStr: string) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function buildWaUrl(b: PendingBooking) {
  const lines = [
    '🍽️ *Table Booking — Two In One UAE*',
    '',
    `🪑 *Table:* ${b.table_id} — ${b.table_section}`,
    `👥 *Seats:* ${b.seats}`,
    '',
    `👤 *Name:* ${b.guest_name}`,
    `📞 *Phone:* ${b.phone}`,
    `📅 *Date:* ${formatDate(b.date)}`,
    `⏰ *Time:* ${formatTime(b.time)}`,
    `🧑‍🤝‍🧑 *Guests:* ${b.guests}`,
    b.notes ? `📝 *Special Requests:* ${b.notes}` : '',
    '',
    'Please confirm my reservation. Thank you!',
  ].filter(Boolean).join('\n')
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines)}`
}

export default function ConfirmBookingClient() {
  const router = useRouter()
  const [booking, setBooking] = useState<PendingBooking | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('pendingBooking')
    if (!raw) {
      router.push('/book-table')
      return
    }
    setBooking(JSON.parse(raw))
  }, [router])

  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    if (!booking || saving) return
    setSaving(true)

    // Persist the booking (links to the user's account if logged in)
    try {
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...booking, type: 'table', status: 'pending' }),
      })
    } catch {
      /* even if saving fails, still let the user reach WhatsApp */
    }

    sessionStorage.removeItem('pendingBooking')
    window.open(buildWaUrl(booking), '_blank')
    setSaving(false)
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <p className="text-[#6B7280] text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A1A]" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <main className="max-w-lg mx-auto px-3 sm:px-4 pb-8">

        <div className="pt-4 pb-1 text-center">
          <h1 className="text-xl sm:text-2xl font-extrabold">Confirm Booking</h1>
          <p className="text-[12.5px] text-[#6B7280] mt-0.5">Review your details then send to WhatsApp</p>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-2xl shadow-sm mt-3 px-3 py-3.5">
          <div className="flex items-center justify-between gap-1">
            {[
              { label: 'Select Area', active: false },
              { label: 'Your Details', active: false },
              { label: 'Confirm Booking', active: true },
            ].map((s, i, arr) => (
              <div key={s.label} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-2 px-2 py-1 ${s.active ? 'border-b-2 border-[#E8521A]' : ''}`}>
                  <span className={s.active ? 'text-[#E8521A]' : 'text-green-500'}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </span>
                  <span className={`text-[12px] font-semibold whitespace-nowrap ${s.active ? 'text-[#E8521A]' : 'text-green-600'}`}>{s.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <span className="text-[#C5C8CE] mx-auto">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Booking summary */}
        <div className="bg-white rounded-2xl shadow-sm mt-3 overflow-hidden">
          <div className="bg-[#E8521A] px-5 py-4">
            <p className="text-white text-[11px] font-semibold uppercase tracking-wider opacity-80">Booking Summary</p>
            <p className="text-white font-extrabold text-lg mt-0.5">Table {booking.table_id}</p>
          </div>
          <div className="p-5 space-y-3">
            <Row label="Location" value={booking.table_section} />
            <Row label="Table Capacity" value={`${booking.seats} seats`} />
            <div className="border-t border-gray-100 pt-3 space-y-3">
              <Row label="Guest Name" value={booking.guest_name} />
              <Row label="Phone" value={booking.phone} />
              <Row label="Date" value={formatDate(booking.date)} />
              <Row label="Time" value={formatTime(booking.time)} />
              <Row label="Guests" value={`${booking.guests} people`} />
              {booking.notes && <Row label="Special Requests" value={booking.notes} />}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 space-y-3">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-[#25D366] text-white font-extrabold text-base hover:bg-[#1ebe5d] transition shadow-md flex items-center justify-center gap-2.5 disabled:opacity-70"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {saving ? 'Saving…' : 'Confirm Booking on WhatsApp'}
          </button>
          <Link
            href="/book-table"
            className="block w-full py-3.5 rounded-2xl border border-gray-200 bg-white text-[#374151] font-semibold text-sm text-center hover:bg-gray-50 transition"
          >
            ← Go Back &amp; Edit
          </Link>
        </div>

      </main>
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[12.5px] text-[#6B7280] shrink-0">{label}</span>
      <span className={`text-[13px] font-semibold text-right ${accent ? 'text-[#E8521A]' : 'text-[#1A1A1A]'}`}>{value}</span>
    </div>
  )
}
