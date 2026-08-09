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

/**
 * The number an order is sent to.
 *
 * The branch keeps its own in admin → University Kalba → Branch Info; leaving
 * that blank falls back to the one number in admin → Settings, so a business
 * running a single line does not have to remember two places. Digits only:
 * wa.me rejects a leading "+", and admin fields are typed either way.
 */
export function orderWhatsapp(branch?: string | null, site?: string | null): string {
  const digits = (value?: string | null) => (value ?? "").replace(/\D/g, "");
  return digits(branch) || digits(site) || "971522305216";
}
