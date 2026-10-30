-- Paid / not paid for orders from the /kitchens page, shown in admin → Kitchens
-- Page → Payments. Served orders appear there, unpaid until this is set.
--
-- Run supabase/kitchen_orders.sql first. Safe to re-run.

ALTER TABLE kitchen_orders
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS kitchen_orders_payment_idx
  ON kitchen_orders (status, paid_at, created_at DESC);
