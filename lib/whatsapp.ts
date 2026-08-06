export interface CateringEnquiry {
  name: string;
  phone: string;
  eventType: string;
  guests: number;
  date: string;
  timeSlot: string;
  notes?: string;
}

const WHATSAPP_NUMBER = "971522305216";

/**
 * The caller supplies the already-translated lines — the customer sends this
 * message from their own WhatsApp, so it reads in whichever language they are
 * browsing in. See cateringForm.wa.* in the dictionaries.
 */
export function buildWhatsAppUrl(lines: string[]): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    lines.filter(Boolean).join("\n"),
  )}`;
}
