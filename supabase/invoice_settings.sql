-- Every word printed on a tax invoice, and which of its rows appear at all.
--
-- One row, edited in admin → Invoice. Defaults reproduce the reference receipt,
-- so a fresh install prints exactly that and each field can be overwritten one
-- at a time. Run supabase/order_invoices.sql too — that one gives every order
-- the number this prints.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS invoice_settings (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Head. Blank logo falls back to the site logo from admin → Settings.
  logo_url         text        NOT NULL DEFAULT '',
  show_logo        boolean     NOT NULL DEFAULT true,
  business_name    text        NOT NULL DEFAULT 'Two in One',
  branch_line      text        NOT NULL DEFAULT 'Kalba Branch',
  trn_label        text        NOT NULL DEFAULT 'TRN #',
  trn_number       text        NOT NULL DEFAULT '',
  tel_label        text        NOT NULL DEFAULT 'Tel No.',
  tel_number       text        NOT NULL DEFAULT '',

  -- Title
  title            text        NOT NULL DEFAULT 'Tax Invoice',
  number_label     text        NOT NULL DEFAULT 'INV #',

  -- The facts above the items
  order_type_label text        NOT NULL DEFAULT 'Order Type',
  table_label      text        NOT NULL DEFAULT 'Table Number',
  staff_label      text        NOT NULL DEFAULT 'Staff',
  staff_name       text        NOT NULL DEFAULT 'cashier',
  customer_label   text        NOT NULL DEFAULT 'Customer',
  phone_label      text        NOT NULL DEFAULT 'Phone',

  -- Item table
  qty_label        text        NOT NULL DEFAULT 'Qty',
  item_label       text        NOT NULL DEFAULT 'Item',
  amount_label     text        NOT NULL DEFAULT 'Amount',

  -- Money
  subtotal_label   text        NOT NULL DEFAULT 'Sub Total:',
  discount_label   text        NOT NULL DEFAULT 'Discount:',
  tax_label        text        NOT NULL DEFAULT 'Tax:',
  surcharge_label  text        NOT NULL DEFAULT 'Surcharges Tax:',
  show_surcharge   boolean     NOT NULL DEFAULT true,
  total_label      text        NOT NULL DEFAULT 'Total:',
  paid_label       text        NOT NULL DEFAULT 'Total Paid:',
  show_paid        boolean     NOT NULL DEFAULT true,
  -- How each payment method is worded on the bill.
  cash_label       text        NOT NULL DEFAULT 'Cash',
  card_label       text        NOT NULL DEFAULT 'Card',
  -- Printed when nobody has marked how the order was settled yet.
  pending_label    text        NOT NULL DEFAULT 'Unpaid',
  tips_label       text        NOT NULL DEFAULT 'Tips:',
  show_tips        boolean     NOT NULL DEFAULT true,
  -- Printed against the order's Pickup / Delivery.
  fulfilment_label text        NOT NULL DEFAULT 'Fulfilment:',
  show_fulfilment  boolean     NOT NULL DEFAULT true,
  currency_symbol  text        NOT NULL DEFAULT '',

  -- Foot
  footer_text      text        NOT NULL DEFAULT '',

  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- For a database that ran an earlier copy of this file.
ALTER TABLE invoice_settings
  ADD COLUMN IF NOT EXISTS pending_label text NOT NULL DEFAULT 'Unpaid';

-- Read server-side via the service role key, which bypasses RLS.
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;

-- Exactly one row, and only if there isn't one already.
INSERT INTO invoice_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM invoice_settings);
