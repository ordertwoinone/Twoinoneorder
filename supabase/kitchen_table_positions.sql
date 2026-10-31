-- Where each table sits on the floor map in the /kitchens popup, set by dragging
-- in admin → Kitchens Page → Tables → Floor map.
--
-- pos_x and pos_y are the table's centre as a percentage of the map, so one
-- layout fits every screen. Null means not placed yet: the map arranges it
-- automatically until someone drags it.
--
-- Run supabase/kitchen_tables.sql first. Safe to re-run.

ALTER TABLE kitchen_tables
  ADD COLUMN IF NOT EXISTS pos_x numeric(5,2),
  ADD COLUMN IF NOT EXISTS pos_y numeric(5,2),
  ADD COLUMN IF NOT EXISTS shape text NOT NULL DEFAULT 'square'
    CHECK (shape IN ('square', 'round', 'long'));
