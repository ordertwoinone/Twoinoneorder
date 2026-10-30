-- Add-ons for the dishes on the /kitchens page, set in admin → Kitchens Page →
-- Dishes → edit a dish → Add-ons.
--
-- A group is one question the customer is asked ("Choose a side") and its add-ons
-- are the answers, each with an optional photo. See kalba_addon_groups.sql for
-- how min_select and max_select combine.
--
-- Run supabase/kitchen_dishes.sql first — these hang off that table.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS kitchen_addon_groups (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Deleting the dish takes its questions with it.
  item_id    uuid        NOT NULL REFERENCES kitchen_dishes (id) ON DELETE CASCADE,
  name       text        NOT NULL DEFAULT '',
  name_ar    text        NOT NULL DEFAULT '',
  -- 0 = the group may be skipped. 1 or more = it must be answered.
  min_select integer     NOT NULL DEFAULT 0,
  -- 0 = no ceiling. 1 = a single choice.
  max_select integer     NOT NULL DEFAULT 1,
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kitchen_addon_groups_item_idx
  ON kitchen_addon_groups (item_id, sort_order);

CREATE TABLE IF NOT EXISTS kitchen_addons (
  id         uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id    uuid          NOT NULL REFERENCES kitchen_dishes (id) ON DELETE CASCADE,
  group_id   uuid          REFERENCES kitchen_addon_groups (id) ON DELETE CASCADE,
  name       text          NOT NULL DEFAULT '',
  name_ar    text          NOT NULL DEFAULT '',
  image_url  text          NOT NULL DEFAULT '',
  -- AED. 0 means it is included in the price of the dish.
  price      numeric(10,2) NOT NULL DEFAULT 0,
  is_active  boolean       NOT NULL DEFAULT true,
  sort_order integer       NOT NULL DEFAULT 0,
  created_at timestamptz   DEFAULT now(),
  updated_at timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kitchen_addons_item_idx
  ON kitchen_addons (item_id, sort_order);
CREATE INDEX IF NOT EXISTS kitchen_addons_group_idx
  ON kitchen_addons (group_id, sort_order);

-- Read and written only through the service role, as with the other admin tables.
ALTER TABLE kitchen_addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_addons       ENABLE ROW LEVEL SECURITY;
