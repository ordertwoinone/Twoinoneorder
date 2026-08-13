-- Add-ons ("extras") that can be attached to a Popular Around Campus item.
--
-- Admin → University Kalba → Popular Around Campus → edit an item → Add-ons.
-- A shopper who puts that item in the cart is then asked which extras they
-- want, and the ones they pick are priced into the order and sent with it.
--
-- Safe to re-run. Until it has been run the site behaves exactly as before:
-- everything that reads this table tolerates it being missing and treats every
-- item as having no add-ons.

CREATE TABLE IF NOT EXISTS kalba_item_addons (
  id         uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Deleting the dish takes its extras with it; they mean nothing on their own.
  item_id    uuid          NOT NULL REFERENCES kalba_popular_items (id) ON DELETE CASCADE,
  name       text          NOT NULL DEFAULT '',
  name_ar    text          NOT NULL DEFAULT '',
  -- AED. 0 is a real choice — "no sauce" costs nothing but is still an option.
  price      numeric(10,2) NOT NULL DEFAULT 0,
  is_active  boolean       NOT NULL DEFAULT true,
  sort_order integer       NOT NULL DEFAULT 0,
  created_at timestamptz   DEFAULT now(),
  updated_at timestamptz   DEFAULT now()
);

-- Every read is "the add-ons for these items, in order".
CREATE INDEX IF NOT EXISTS kalba_item_addons_item_idx
  ON kalba_item_addons (item_id, sort_order);

-- Read server-side via the service role key, which bypasses RLS. Enabling it
-- with no policies blocks direct access with the public anon key.
ALTER TABLE kalba_item_addons ENABLE ROW LEVEL SECURITY;
