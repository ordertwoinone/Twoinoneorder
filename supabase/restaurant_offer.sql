-- Adds a free-text offer line for the homepage restaurant card, e.g.
-- "30% OFF" or "Buy 1 Get 1". Shown as a pill under the card details on
-- mobile. When NULL/empty, the card simply omits it.
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS offer_text text;

COMMENT ON COLUMN public.restaurants.offer_text IS
  'Optional offer shown as a pill on the homepage restaurant card (e.g. "30% OFF"). Hidden when NULL/empty.';
