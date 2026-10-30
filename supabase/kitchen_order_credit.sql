-- How a /kitchens order was paid, and who owes for one on credit. Used by admin
-- → Kitchens Page → Payments and Credit.
--
--   Not paid          payment_method null, paid_at null
--   Paid              payment_method card or cash, paid_at set
--   On credit         payment_method credit, paid_at null, credit_* set
--   Credit settled    payment_method card or cash, paid_at set, credit_* kept
--
-- Run supabase/kitchen_order_payments.sql first. Safe to re-run.

ALTER TABLE kitchen_orders
  ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('card', 'cash', 'credit')),
  ADD COLUMN IF NOT EXISTS credit_name    text,
  ADD COLUMN IF NOT EXISTS credit_phone   text,
  ADD COLUMN IF NOT EXISTS credit_at      timestamptz;

CREATE INDEX IF NOT EXISTS kitchen_orders_credit_idx
  ON kitchen_orders (credit_at DESC) WHERE credit_at IS NOT NULL;
