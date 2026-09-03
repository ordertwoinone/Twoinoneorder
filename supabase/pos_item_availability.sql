-- "We've run out of green tea."
--
-- Until now the only way to take a dish off the till was admin → Popular Around
-- Campus → is_active, which unpublishes it from the website and the branch page
-- as well. That is a different statement: is_active means "we do not sell this",
-- and what a cook needs at seven in the evening is "we are not selling this
-- tonight" — off the till and off the kiosk, still on the menu.
--
-- Hence a second flag, owned by the branch rather than by marketing, toggled
-- from the till itself. The website ignores it; the two screens that take money
-- in the building honour it.
--
-- Safe to re-run.

ALTER TABLE kalba_popular_items
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true,
  -- Who switched it, and when. A dish that has been off for three days is
  -- usually forgotten rather than out of stock, and the list says so.
  ADD COLUMN IF NOT EXISTS availability_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS availability_changed_by uuid REFERENCES pos_staff(id) ON DELETE SET NULL;

COMMENT ON COLUMN kalba_popular_items.is_available IS
  'Branch stock switch, set at the till. false hides the dish from POS and kiosk only.';

-- The till and the kiosk both read "what can I sell right now", which is this
-- flag alongside is_active.
CREATE INDEX IF NOT EXISTS kalba_popular_items_sellable_idx
  ON kalba_popular_items (is_available) WHERE is_active;
