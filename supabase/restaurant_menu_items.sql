-- Imported menus for the four restaurants.
--
-- The restaurants order through take.app storefronts (order.twoinoneae.com,
-- order.falafelalnile.com, miniboxae.com, karaksnack.com), which expose no
-- public API — the catalogue is scraped from each store's sitemap and category
-- pages and cached here so the admin panel can list everything restaurant-wise
-- without hitting the storefronts on every page load.
--
-- Rows are keyed on the take.app product id, so re-syncing updates in place
-- rather than duplicating. Items that disappear upstream are marked
-- is_available = false instead of being deleted, so nothing referencing them
-- breaks.

-- show_in_top_picks publishes an imported item to the home page "Top Picks For
-- You" strip. The sync only writes the columns it scrapes, so this flag (and
-- its ordering) survives a re-import untouched.

create table if not exists restaurant_menu_items (
  id                   uuid primary key default gen_random_uuid(),
  restaurant_id        uuid not null references restaurants(id) on delete cascade,
  external_id          text not null,
  name                 text not null,
  price                numeric(10,2),
  currency             text not null default 'AED',
  image_url            text,
  category             text,
  category_external_id text,
  product_url          text,
  is_available         boolean not null default true,
  show_in_top_picks    boolean not null default false,
  top_picks_order      integer not null default 0,
  last_synced_at       timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  unique (restaurant_id, external_id)
);

create index if not exists restaurant_menu_items_top_picks_idx
  on restaurant_menu_items (top_picks_order) where show_in_top_picks;

create index if not exists restaurant_menu_items_restaurant_idx
  on restaurant_menu_items (restaurant_id, category, name);

alter table restaurant_menu_items enable row level security;

-- Menus are public catalogue data; writes go through the service role only.
drop policy if exists "restaurant_menu_items public read" on restaurant_menu_items;
create policy "restaurant_menu_items public read"
  on restaurant_menu_items for select
  using (true);
