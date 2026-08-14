-- Choice groups for a Popular Around Campus item.
--
-- A group is one question the shopper is asked — "Choice of Side item",
-- "Choice of Beverages" — and the add-ons in it are the answers. How many may
-- be picked is the group's business:
--
--   min_select 1, max_select 1   Required, exactly one. Radio buttons.
--   min_select 0, max_select 1   Optional, at most one.
--   min_select 1, max_select 3   Required, one to three. Tick boxes.
--   min_select 0, max_select 0   Optional, as many as they like.
--
-- Run supabase/kalba_item_addons.sql first — this hangs off that table.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS kalba_addon_groups (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Deleting the dish takes its questions with it.
  item_id    uuid        NOT NULL REFERENCES kalba_popular_items (id) ON DELETE CASCADE,
  name       text        NOT NULL DEFAULT '',
  name_ar    text        NOT NULL DEFAULT '',
  -- 0 = the group may be skipped. 1 or more = it must be answered.
  min_select integer     NOT NULL DEFAULT 0,
  -- 0 = no ceiling. 1 = a single choice, drawn as radio buttons.
  max_select integer     NOT NULL DEFAULT 1,
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kalba_addon_groups_item_idx
  ON kalba_addon_groups (item_id, sort_order);

-- Which question an add-on answers. NULL means it predates groups: those are
-- still offered, gathered under one optional "Extras" heading.
ALTER TABLE kalba_item_addons
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES kalba_addon_groups (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS kalba_item_addons_group_idx
  ON kalba_item_addons (group_id, sort_order);

-- Read server-side via the service role key, which bypasses RLS.
ALTER TABLE kalba_addon_groups ENABLE ROW LEVEL SECURITY;
