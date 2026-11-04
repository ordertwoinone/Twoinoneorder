-- Discounts and part payments for /kitchens orders, taken in admin → Kitchens
-- Page → Payments and Credit.
--
--   discount      AED off the order. total stays the price of the items, so
--                 the amount due is total - discount.
--   cash_amount   Cash taken for the order so far, after any change given.
--   card_amount   Card taken for the order so far.
--   paid_amount   (from kitchen_order_rounds.sql) everything taken so far, so
--                 the balance is total - discount - paid_amount.
--
-- An order paid partly in cash and partly by card has payment_method 'split'.
-- Whatever is left can stay on Payments as a balance, or go on credit.
--
-- Run supabase/kitchen_order_credit.sql and kitchen_order_rounds.sql first.
-- Safe to re-run.

ALTER TABLE kitchen_orders
  ADD COLUMN IF NOT EXISTS discount    numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  ADD COLUMN IF NOT EXISTS cash_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (cash_amount >= 0),
  ADD COLUMN IF NOT EXISTS card_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (card_amount >= 0);

ALTER TABLE kitchen_orders DROP CONSTRAINT IF EXISTS kitchen_orders_payment_method_check;
ALTER TABLE kitchen_orders
  ADD CONSTRAINT kitchen_orders_payment_method_check
  CHECK (payment_method IN ('card', 'cash', 'split', 'credit'));
