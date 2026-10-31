-- Adds the Ready step to /kitchens orders: the kitchen has finished, and the
-- waiter's timer runs until the order is served.
--
-- Run this BEFORE deploying the code that uses it, or Mark ready will fail.
-- Run supabase/kitchen_orders.sql first. Safe to re-run.

ALTER TABLE kitchen_orders
  ADD COLUMN IF NOT EXISTS ready_at timestamptz;

ALTER TABLE kitchen_orders DROP CONSTRAINT IF EXISTS kitchen_orders_status_check;
ALTER TABLE kitchen_orders ADD CONSTRAINT kitchen_orders_status_check
  CHECK (status IN ('new', 'preparing', 'ready', 'served', 'cancelled'));
