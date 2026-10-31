-- Lets a served /kitchens order take more items and go back to the kitchen as the
-- same order, and records its history. Used by admin → Kitchens Page → Served
-- Orders.
--
--   round             1 for the first cooking, 2 after items are first added...
--   round_started_at  When the current cooking began, so the timer starts afresh.
--   paid_amount       What was already paid before items were added. The balance
--                     owed is total minus this.
--   events            The order's history: [{ type, at, ... }, ...]
--
-- Run supabase/kitchen_order_ready.sql first. Safe to re-run.

ALTER TABLE kitchen_orders
  ADD COLUMN IF NOT EXISTS round            integer       NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS round_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_amount      numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS events           jsonb         NOT NULL DEFAULT '[]'::jsonb;
