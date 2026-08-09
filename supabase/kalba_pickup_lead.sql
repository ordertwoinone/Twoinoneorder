-- Run this in your Supabase SQL editor to let the branch set its own pickup lead time.
--
-- The cart's pickup time picker offers nothing sooner than now + this many
-- minutes, so a customer cannot ask for food faster than the kitchen can make
-- it. Edited in admin → University Kalba → Branch Info.

ALTER TABLE kalba_hero
  ADD COLUMN IF NOT EXISTS pickup_lead_minutes integer NOT NULL DEFAULT 30;

COMMENT ON COLUMN kalba_hero.pickup_lead_minutes IS
  'How long the kitchen needs before an order can be collected. The pickup time picker offers nothing sooner than now + this many minutes.';
