-- Lets the admin panel decide the order restaurants appear in on the
-- homepage, rather than always newest-first.
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.restaurants.sort_order IS
  'Homepage position, lowest first. Managed by the arrows in admin → Restaurants.';

-- Seed it with the order the homepage already shows (newest first) so
-- switching to sort_order doesn't reshuffle the page.
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at DESC) AS rn
  FROM public.restaurants
)
UPDATE public.restaurants r
SET sort_order = o.rn
FROM ordered o
WHERE r.id = o.id AND r.sort_order = 0;
