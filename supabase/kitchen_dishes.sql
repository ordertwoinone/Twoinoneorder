-- Dishes on the /kitchens page, managed in admin → Kitchens.
--
-- meal and kitchen are the two categories a dish is filed under. The page shows
-- its built-in samples until this table has at least one active dish.
--
-- Run in the Supabase SQL editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS kitchen_dishes (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  meal            text          NOT NULL CHECK (meal IN ('breakfast', 'lunch', 'dinner')),
  kitchen         text          NOT NULL CHECK (kitchen IN ('italian', 'turkish')),
  name            text          NOT NULL,
  name_ar         text          NOT NULL DEFAULT '',
  description     text          NOT NULL DEFAULT '',
  description_ar  text          NOT NULL DEFAULT '',
  price           numeric(10,2) NOT NULL CHECK (price >= 0),
  kcal            integer       CHECK (kcal IS NULL OR kcal >= 0),
  -- How many people the dish feeds. The menu lists the closest match to the party first.
  serves          integer       NOT NULL DEFAULT 1 CHECK (serves >= 1),
  image_url       text          NOT NULL DEFAULT '',
  badge           text          CHECK (badge IS NULL OR badge IN ('pizza', 'bbq', 'fresh', 'morning')),
  is_healthy      boolean       NOT NULL DEFAULT false,
  is_high_protein boolean       NOT NULL DEFAULT false,
  sort_order      integer       NOT NULL DEFAULT 0,
  is_active       boolean       NOT NULL DEFAULT true,
  created_at      timestamptz   DEFAULT now(),
  updated_at      timestamptz   DEFAULT now()
);

-- For a database that ran an earlier copy of this file.
ALTER TABLE kitchen_dishes
  ADD COLUMN IF NOT EXISTS serves integer NOT NULL DEFAULT 1 CHECK (serves >= 1);

-- Read and written only through the service role, as with the other admin tables.
ALTER TABLE kitchen_dishes ENABLE ROW LEVEL SECURITY;
