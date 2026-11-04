-- Sub-categories managed in admin → Kitchens Page → Categories. They show as
-- filter chips under the kitchen buttons on /kitchens, and a dish can be in
-- any number of them.
--
-- Run supabase/kitchen_dishes.sql first. Safe to re-run.

CREATE TABLE IF NOT EXISTS kitchen_categories (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  name_ar     text        NOT NULL DEFAULT '',
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Read and written only through the service role, as with the other admin tables.
ALTER TABLE kitchen_categories ENABLE ROW LEVEL SECURITY;

-- The categories a dish is in. A deleted category is dropped from the page
-- even while its id is still listed here.
ALTER TABLE kitchen_dishes
  ADD COLUMN IF NOT EXISTS category_ids uuid[] NOT NULL DEFAULT '{}';
