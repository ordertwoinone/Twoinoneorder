-- Files a Kalba dish under one of the categories in kalba_categories, so the
-- storefront can show it under that heading instead of in one flat grid.
--
-- Set in admin → University Kalba → Popular Around Campus / University Specials
-- → edit an item → Category. The headings follow kalba_categories.sort_order,
-- so reordering the categories reorders the page.
--
-- Optional: a dish left with no category still shows, in a "More Around
-- Campus" block at the end — nothing goes missing while items are being filed.
--
-- The column holds the category's uuid as text rather than a foreign key: a
-- category the admin deletes should leave its dishes on the page, unfiled,
-- rather than take them down or block the delete.
--
-- Safe to re-run.

ALTER TABLE kalba_popular_items
  ADD COLUMN IF NOT EXISTS category_id text;

ALTER TABLE kalba_specials
  ADD COLUMN IF NOT EXISTS category_id text;
