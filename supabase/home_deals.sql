-- A second home-page strip: "Deals You'll Love".
--
-- Built exactly like Top Picks — each item table gets its own flag and order,
-- so an item is published to a strip by switching it on in the admin panel
-- rather than being copied into a separate table. An item may appear in both.
--
-- Also lets both strips' headings be written in admin → Homepage → Home
-- Sections. Blank means "use the wording that ships with the site", so an
-- untouched site reads exactly as it does today, translations included.
--
-- Safe to re-run.

alter table buffet_menu_items
  add column if not exists show_in_deals boolean not null default false,
  add column if not exists deals_order   integer not null default 0;

alter table buffet_popular_dishes
  add column if not exists show_in_deals boolean not null default false,
  add column if not exists deals_order   integer not null default 0;

alter table kalba_popular_items
  add column if not exists show_in_deals boolean not null default false,
  add column if not exists deals_order   integer not null default 0;

alter table kalba_specials
  add column if not exists show_in_deals boolean not null default false,
  add column if not exists deals_order   integer not null default 0;

alter table restaurant_menu_items
  add column if not exists show_in_deals boolean not null default false,
  add column if not exists deals_order   integer not null default 0;

-- The home page only ever reads the flagged rows, so index just those.
create index if not exists buffet_menu_items_deals_idx
  on buffet_menu_items (deals_order) where show_in_deals;
create index if not exists buffet_popular_dishes_deals_idx
  on buffet_popular_dishes (deals_order) where show_in_deals;
create index if not exists kalba_popular_items_deals_idx
  on kalba_popular_items (deals_order) where show_in_deals;
create index if not exists kalba_specials_deals_idx
  on kalba_specials (deals_order) where show_in_deals;
create index if not exists restaurant_menu_items_deals_idx
  on restaurant_menu_items (deals_order) where show_in_deals;

-- Headings for both strips. Blank = the built-in wording.
alter table site_settings
  add column if not exists top_picks_title       text not null default '',
  add column if not exists top_picks_title_ar    text not null default '',
  add column if not exists top_picks_subtitle    text not null default '',
  add column if not exists top_picks_subtitle_ar text not null default '',
  add column if not exists deals_title           text not null default '',
  add column if not exists deals_title_ar        text not null default '',
  add column if not exists deals_subtitle        text not null default '',
  add column if not exists deals_subtitle_ar     text not null default '';
