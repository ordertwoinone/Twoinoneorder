-- Adds an optional per-offer background colour for the homepage Special Offers card.
-- When NULL/empty the card falls back to the default orange→purple gradient.
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS card_color text;

COMMENT ON COLUMN public.offers.card_color IS
  'Optional background for the homepage offer slide card (solid color or CSS gradient). When NULL/empty, the default gradient is used.';
