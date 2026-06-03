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

export function buildWhatsAppUrl(enquiry: CateringEnquiry): string {
  const message = `*New Catering Enquiry from Two In One UAE*

👤 *Name:* ${enquiry.name}
📞 *Phone:* ${enquiry.phone}
🎉 *Event:* ${enquiry.eventType}
👥 *Guests:* ${enquiry.guests}
📅 *Date:* ${enquiry.date}
⏰ *Time:* ${enquiry.timeSlot}${enquiry.notes ? `\n📝 *Notes:* ${enquiry.notes}` : ""}

_Sent via Two In One UAE website_`;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
