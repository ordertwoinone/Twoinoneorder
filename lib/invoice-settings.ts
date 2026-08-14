/**
 * Every word printed on a tax invoice, and which of its rows appear at all.
 *
 * Edited in admin → Invoice. Nothing here is wording the code should own: a
 * TRN is a legal requirement that changes per business, "Tax Invoice" is a
 * heading a tax authority may want worded differently, and a receipt that is
 * right in one emirate is not automatically right in the next.
 *
 * Every field defaults to the wording on the reference receipt, so an untouched
 * install prints exactly that and each field can be overwritten one at a time.
 */

export interface InvoiceSettings {
  /* ── Head ─────────────────────────────────────────────────────────── */
  /** Blank falls back to the site logo from admin → Settings. */
  logo_url: string;
  show_logo: boolean;
  business_name: string;
  branch_line: string;
  trn_label: string;
  trn_number: string;
  tel_label: string;
  tel_number: string;

  /* ── Title ────────────────────────────────────────────────────────── */
  title: string;
  number_label: string;

  /* ── The facts above the items ────────────────────────────────────── */
  order_type_label: string;
  table_label: string;
  staff_label: string;
  staff_name: string;
  customer_label: string;
  phone_label: string;

  /* ── Item table ───────────────────────────────────────────────────── */
  qty_label: string;
  item_label: string;
  amount_label: string;

  /* ── Money ────────────────────────────────────────────────────────── */
  subtotal_label: string;
  discount_label: string;
  tax_label: string;
  surcharge_label: string;
  show_surcharge: boolean;
  total_label: string;
  payment_label: string;
  paid_label: string;
  show_paid: boolean;
  tips_label: string;
  show_tips: boolean;
  change_label: string;
  show_change: boolean;
  /** Printed before every amount. Blank for none. */
  currency_symbol: string;

  /* ── Foot ─────────────────────────────────────────────────────────── */
  footer_text: string;
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  logo_url: "",
  show_logo: true,
  business_name: "Two in One",
  branch_line: "Kalba Branch",
  trn_label: "TRN #",
  trn_number: "",
  tel_label: "Tel No.",
  tel_number: "",

  title: "Tax Invoice",
  number_label: "INV #",

  order_type_label: "Order Type",
  table_label: "Table Number",
  staff_label: "Staff",
  staff_name: "cashier",
  customer_label: "Customer",
  phone_label: "Phone",

  qty_label: "Qty",
  item_label: "Item",
  amount_label: "Amount",

  subtotal_label: "Sub Total:",
  discount_label: "Discount:",
  tax_label: "Tax:",
  surcharge_label: "Surcharges Tax:",
  show_surcharge: true,
  total_label: "Total:",
  payment_label: "Visa",
  paid_label: "Total Paid:",
  show_paid: true,
  tips_label: "Tips:",
  show_tips: true,
  change_label: "Change:",
  show_change: true,
  currency_symbol: "",

  footer_text: "",
};

type Row = Partial<Record<keyof InvoiceSettings, unknown>> | null | undefined;

/**
 * Fills in whatever the row is missing.
 *
 * A blank label is honoured rather than replaced — emptying "Surcharges Tax:"
 * has to be a way of removing it, or the switches beside it would be the only
 * way and the field would be a lie.
 */
export function normalizeInvoiceSettings(row: Row): InvoiceSettings {
  const out = { ...DEFAULT_INVOICE_SETTINGS };
  if (!row) return out;

  for (const key of Object.keys(DEFAULT_INVOICE_SETTINGS) as (keyof InvoiceSettings)[]) {
    const value = row[key];
    if (typeof DEFAULT_INVOICE_SETTINGS[key] === "boolean") {
      if (typeof value === "boolean") (out[key] as boolean) = value;
    } else if (typeof value === "string") {
      (out[key] as string) = value.trim();
    }
  }

  return out;
}
