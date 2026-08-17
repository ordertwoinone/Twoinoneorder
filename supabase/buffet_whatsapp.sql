-- The number buffet reservations are sent to.
--
-- University Kalba has kept its own since it opened (admin → University Kalba →
-- Branch Info); the buffet had none, so both fell through to the single number
-- in admin → Settings and every order landed on the same phone.
--
-- Blank still falls back to admin → Settings, so a business running one line
-- does not have to fill this in.
--
-- Safe to re-run.

ALTER TABLE buffet_hero
  ADD COLUMN IF NOT EXISTS whatsapp text NOT NULL DEFAULT '';
