-- Order numbers and tax invoices.
--
-- Every booking — a table, a buffet reservation, a catering enquiry, a Kalba
-- food order — gets a number a customer can quote and staff can search for, and
-- enough structure behind it to print a real tax invoice rather than a receipt
-- reconstructed from a free-text note.
--
-- Safe to re-run.

-- ─── The number ──────────────────────────────────────────────────────────────
-- A sequence, not a count of rows: deleting an order must never hand its number
-- to the next one. Starts high enough to look like a going concern rather than
-- telling every early customer they are the third.

CREATE SEQUENCE IF NOT EXISTS booking_order_number_seq START 1000;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS order_number integer;

-- Orders taken before this ran still need a number, oldest first so the
-- sequence agrees with the order they were actually placed in.
WITH numbered AS (
  SELECT id, nextval('booking_order_number_seq') AS n
  FROM (SELECT id FROM bookings WHERE order_number IS NULL ORDER BY created_at) AS pending
)
UPDATE bookings SET order_number = numbered.n
FROM numbered WHERE bookings.id = numbered.id;

ALTER TABLE bookings
  ALTER COLUMN order_number SET DEFAULT nextval('booking_order_number_seq');

CREATE UNIQUE INDEX IF NOT EXISTS bookings_order_number_idx
  ON bookings (order_number);

-- ─── What was actually ordered ───────────────────────────────────────────────
-- items is [{ name, qty, unit_price, extras, line_total }]. Kept as sent rather
-- than joined back to the menu: an invoice has to say what was charged that
-- day, and a dish's price changes.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS items          jsonb         NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS subtotal       numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_total numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount     numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount   numeric(10,2) NOT NULL DEFAULT 0,
  -- "Pickup", "Delivery", "Dine-in" — printed at the head of the invoice.
  ADD COLUMN IF NOT EXISTS order_type     text          NOT NULL DEFAULT '',
  -- 'pending' | 'cash' | 'card'. An order starts pending because nobody knows
  -- yet: the money changes hands at the counter or the door, after it was
  -- placed. Staff mark it in admin → Order History once they have taken it.
  ADD COLUMN IF NOT EXISTS payment_method text          NOT NULL DEFAULT 'pending';

-- Earlier copies of this file defaulted to 'cash', which quietly claimed every
-- new order had been paid in cash. Only the default changes; rows already
-- marked keep what they were marked with.
ALTER TABLE bookings
  ALTER COLUMN payment_method SET DEFAULT 'pending';

-- What the invoice is headed with, and every word printed on it, lives in
-- supabase/invoice_settings.sql — run that one too.
