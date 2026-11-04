-- Dishes starred in admin → Kitchens Page → Dishes, which come first on /kitchens.
--
-- Run supabase/kitchen_dishes.sql first. Safe to re-run.

ALTER TABLE kitchen_dishes
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;
