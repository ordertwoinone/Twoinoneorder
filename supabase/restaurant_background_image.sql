-- Adds an optional background image for the homepage restaurant card.
-- The image sits behind the brand logo. When NULL/empty, the card uses a
-- plain white background.
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS background_image_url text;

COMMENT ON COLUMN public.restaurants.background_image_url IS
  'Optional background image shown behind the logo on the homepage restaurant card. When NULL/empty, the card uses a plain white background.';
