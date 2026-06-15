import ConfirmBookingClient from './ConfirmBookingClient'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

async function getWhatsApp(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('site_settings')
    .select('whatsapp_number')
    .single()
  return (data?.whatsapp_number || '971522305216').replace(/\D/g, '')
}

export default async function ConfirmBookingPage() {
  const whatsapp = await getWhatsApp()
  return <ConfirmBookingClient whatsapp={whatsapp} />
}
