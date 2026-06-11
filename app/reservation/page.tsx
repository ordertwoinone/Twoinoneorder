import dynamic from 'next/dynamic'

// Loaded client-side only — Three.js cannot run on the server
const TableBookingPage = dynamic(
  () => import('@/components/reservation/TableBookingPage'),
  { ssr: false, loading: () => (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#1A120A',
      color: '#A09080',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '0.9rem',
    }}>
      Loading 3D floor plan…
    </div>
  )}
)

export default function ReservationPage() {
  return <TableBookingPage />
}
