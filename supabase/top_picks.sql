-- Home page "Top Picks For You" section.
--
-- Items live in their own per-area tables (buffet menu, buffet popular dishes,
-- Kalba popular, Kalba specials). Rather than duplicating them into a separate
-- top-picks table, each item table gets a flag: switch show_in_top_picks on in
-- the admin panel and the item appears in the home page strip.
-- top_picks_order controls the left-to-right position across all sources
-- (lower first); ties fall back to the item's own sort_order.

alter table buffet_menu_items
  add column if not exists show_in_top_picks boolean not null default false,
  add column if not exists top_picks_order   integer not null default 0;

alter table buffet_popular_dishes
  add column if not exists show_in_top_picks boolean not null default false,
  add column if not exists top_picks_order   integer not null default 0;

alter table kalba_popular_items
  add column if not exists show_in_top_picks boolean not null default false,
  add column if not exists top_picks_order   integer not null default 0;

alter table kalba_specials
  add column if not exists show_in_top_picks boolean not null default false,
  add column if not exists top_picks_order   integer not null default 0;

-- The home page only ever reads the flagged rows, so index just those.
create index if not exists buffet_menu_items_top_picks_idx
  on buffet_menu_items (top_picks_order) where show_in_top_picks;
create index if not exists buffet_popular_dishes_top_picks_idx
  on buffet_popular_dishes (top_picks_order) where show_in_top_picks;
create index if not exists kalba_popular_items_top_picks_idx
  on kalba_popular_items (top_picks_order) where show_in_top_picks;
create index if not exists kalba_specials_top_picks_idx
  on kalba_specials (top_picks_order) where show_in_top_picks;
