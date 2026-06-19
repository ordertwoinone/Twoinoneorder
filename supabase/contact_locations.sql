-- Contact page redesign: hero fields on site_settings + restaurant branches table

alter table site_settings
  add column if not exists contact_restaurant_name text default 'Two in One Restaurant',
  add column if not exists contact_rating text default '4.8',
  add column if not exists contact_reviews text default '2.3K+ Reviews',
  add column if not exists contact_location_label text default 'Al Nahda, Fujairah, Dubai',
  add column if not exists contact_hero_image_url text default '';

-- Restaurant branches shown as clickable pins on the contact map
create table if not exists contact_locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  address     text not null default '',
  latitude    double precision not null default 0,
  longitude   double precision not null default 0,
  maps_url    text not null default '',
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table contact_locations enable row level security;

do $$ begin
  create policy "contact_locations public read"
    on contact_locations for select using (true);
exception when duplicate_object then null; end $$;

insert into contact_locations (name, address, latitude, longitude, maps_url, sort_order) values
  ('Mini Box Restaurant', 'Kalba, Sharjah', 25.024245038682984, 56.34595767605059, 'https://www.google.com/maps/search/?api=1&query=25.024245,56.345958', 1),
  ('Falafel Al Nile Restaurant', 'Kalba, Sharjah', 25.022547638751295, 56.34601317605041, 'https://www.google.com/maps/search/?api=1&query=25.022548,56.346013', 2),
  ('Karak & Snack Restaurant', 'Kalba, Sharjah', 25.02428683868121, 56.34595407605047, 'https://www.google.com/maps/search/?api=1&query=25.024287,56.345954', 3),
  ('Two in One Turkish Restaurant', 'Kalba, Sharjah', 25.0788792, 56.3582422, 'https://www.google.com/maps/search/?api=1&query=25.078879,56.358242', 4)
on conflict do nothing;
