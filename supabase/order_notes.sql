-- What the customer wanted said about the food.
--
-- Two different notes, and they are not the same thing:
--
--   Per item — "no onions", "extra spicy" — which belongs to one dish and has
--   to reach whoever is cooking that dish. It rides inside the order's existing
--   `items` array, so no column is needed for it and every screen that already
--   reads a line's extras can read its note beside them.
--
--   Per order — "please call when you arrive", "no cutlery" — which belongs to
--   the whole ticket. That one needs somewhere to live.
--
-- It gets its own column rather than being appended to `notes`, because `notes`
-- is a sentence the kiosk writes for staff — the panel, the items, the total —
-- and burying a customer's words in the middle of it means nobody sees them
-- until somebody complains. A column of its own is a box the board can draw.
--
-- Safe to re-run.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS customer_note text NOT NULL DEFAULT '';

COMMENT ON COLUMN bookings.customer_note IS
  'The customer''s own note for the whole order. Per-item notes live in items[].note.';
