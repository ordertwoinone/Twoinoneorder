-- Per-restaurant colours for the homepage card's badge and offer pills.
-- Blank falls back to the built-in palette: the badge picks a tint from its
-- label (Best Seller → orange, Popular → red, New → purple, anything else
-- grey) and the offer uses the soft amber chip.
alter table restaurants
  add column if not exists badge_bg_color text default '',
  add column if not exists badge_text_color text default '',
  add column if not exists offer_bg_color text default '',
  add column if not exists offer_text_color text default '';

comment on column restaurants.badge_bg_color is
  'Optional background for the card badge pill (any CSS colour). Blank = tint from the badge label.';
comment on column restaurants.offer_bg_color is
  'Optional background for the card offer pill (any CSS colour). Blank = #FEF3C7.';
