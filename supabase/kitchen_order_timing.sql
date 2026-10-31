-- When a /kitchens order was marked served, so its timer stops at how long it
-- took. Orders served before this runs show no time, as it was never recorded.
--
-- Run supabase/kitchen_orders.sql first. Safe to re-run.

ALTER TABLE kitchen_orders
  ADD COLUMN IF NOT EXISTS served_at timestamptz;
