-- A short description for a Popular Around Campus item, shown on its card
-- under the name — "Crispy chicken, lettuce and garlic sauce".
--
-- Set in admin → University Kalba → Popular Around Campus → edit an item.
-- Optional: an item with none reads exactly as it does today, and the Arabic
-- twin falls back to the English text while translations are filled in.
--
-- Safe to re-run. The site works whether or not it has: the pages select every
-- column rather than naming them, and admin writes shed a column the database
-- does not have yet.

ALTER TABLE kalba_popular_items
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description_ar text NOT NULL DEFAULT '';
