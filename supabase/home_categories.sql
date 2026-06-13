-- Homepage cuisine categories (scrollable row below the hero banner)
create table if not exists home_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  emoji      text not null default '🍽️',
  sort_order int  not null default 0,
  is_active  boolean not null default true
);

-- Default seed rows
insert into home_categories (name, emoji, sort_order) values
  ('Arabic',    '🫓', 1),
  ('Indian',    '🍛', 2),
  ('Chinese',   '🥡', 3),
  ('Egyptian',  '🧆', 4),
  ('Grilled',   '🥩', 5),
  ('Sandwich',  '🥪', 6),
  ('Pizza',     '🍕', 7),
  ('Salads',    '🥗', 8),
  ('Drinks',    '☕', 9),
  ('Desserts',  '🍰', 10)
on conflict do nothing;
