-- Campus Promo section (homepage "Now Open on Campus" card)
create table if not exists campus_promo (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default 'Two in One University Kalba',
  subtitle    text not null default 'Made for Students, Loved by Everyone!',
  description text not null default 'Student-friendly prices · Fresh food · Free WiFi',
  badge       text not null default '🎓 On Campus',
  image_url   text not null default '',
  button_text text not null default 'View Menu',
  perk1       text not null default 'Student Prices',
  perk2       text not null default 'Free WiFi',
  perk3       text not null default 'Open Late',
  is_active   boolean not null default true,
  updated_at  timestamptz default now()
);

-- seed one default row so GET returns data immediately
insert into campus_promo (title) values ('Two in One University Kalba')
on conflict do nothing;
