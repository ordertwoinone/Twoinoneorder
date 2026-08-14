import { VAT_PERCENT, roundMoney, vatIncludedIn } from "@/lib/kalba/pricing";

/**
 * A tax invoice, assembled from a booking row.
 *
 * The figures are read off the order as it was placed, not recomputed from
 * today's menu: an invoice has to say what was charged on the day, and a dish's
 * price changes. Only the tax split is derived, because it is a fixed
 * proportion of a total that is already stored.
 */

export interface InvoiceLine {
  name: string;
  qty: number;
  /** Per unit, before extras. */
  unit_price: number;
  /** "Extra cheese, Fries" — printed under the dish. */
  extras?: string;
  /** What the extras add per unit. */
  extras_price?: number;
  /** qty × (unit + extras). */
  line_total: number;
}

export interface InvoiceOrder {
  id: string;
  order_number: number | null;
  type: string;
  order_type: string;
  guest_name: string;
  phone: string;
  table_id: string;
  table_section: string;
  guests: number;
  notes: string;
  status: string;
  created_at: string;
  items: InvoiceLine[];
  subtotal: number;
  discount_total: number;
  tax_amount: number;
  total_amount: number;
}

export interface InvoiceBranding {
  siteName: string;
  branch: string;
  logoUrl: string;
  trn: string;
  phone: string;
  footer: string;
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

/** The order as stored, coerced into what the template can print. */
export function toInvoiceOrder(row: Record<string, unknown>): InvoiceOrder {
  const rawItems = Array.isArray(row.items) ? row.items : [];

  const items: InvoiceLine[] = rawItems.map((entry) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const qty = Math.max(1, Math.round(num(item.qty)) || 1);
    const unit = num(item.unit_price);
    const extrasPrice = num(item.extras_price);
    return {
      name: String(item.name ?? ""),
      qty,
      unit_price: unit,
      extras: item.extras ? String(item.extras) : undefined,
      extras_price: extrasPrice || undefined,
      // Trust the stored line total; fall back to the arithmetic if it is absent.
      line_total: num(item.line_total) || roundMoney((unit + extrasPrice) * qty),
    };
  });

  const total = num(row.total_amount);
  const storedTax = num(row.tax_amount);
  const storedSubtotal = num(row.subtotal);

  /* An order placed before the invoice columns existed has a total but no
     split. Deriving it is right either way — the tax is a fixed proportion of
     a VAT-inclusive total, so it cannot disagree with what was charged. */
  const tax = storedTax || vatIncludedIn(total);
  const subtotal = storedSubtotal || roundMoney(total - tax);

  return {
    id: String(row.id ?? ""),
    order_number: row.order_number == null ? null : Math.round(num(row.order_number)),
    type: String(row.type ?? ""),
    order_type: String(row.order_type ?? ""),
    guest_name: String(row.guest_name ?? ""),
    phone: String(row.phone ?? ""),
    table_id: String(row.table_id ?? ""),
    table_section: String(row.table_section ?? ""),
    guests: Math.round(num(row.guests)),
    notes: String(row.notes ?? ""),
    status: String(row.status ?? ""),
    created_at: String(row.created_at ?? ""),
    items,
    subtotal,
    discount_total: num(row.discount_total),
    tax_amount: tax,
    total_amount: total,
  };
}

/** "INV # 33861", or the row's own id when the migration has not run. */
export function invoiceNumber(order: InvoiceOrder): string {
  return order.order_number != null
    ? String(order.order_number)
    : order.id.slice(0, 8).toUpperCase();
}

/** How the order type reads at the head of the invoice. */
export function orderTypeLabel(order: InvoiceOrder): string {
  if (order.order_type) return order.order_type.toUpperCase();
  const byType: Record<string, string> = {
    table: "DINE-IN",
    buffet: "BUFFET",
    catering: "CATERING",
    kalba: "TAKEAWAY",
  };
  return byType[order.type] ?? "ORDER";
}

export { VAT_PERCENT };
