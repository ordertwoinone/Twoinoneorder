-- Homepage cuisine categories (scrollable row below the hero banner)
create table if not exists home_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  emoji      text not null default '🍽️',
  image_url  text not null default '',
  sort_order int  not null default 0,
  is_active  boolean not null default true
);

-- Add columns if upgrading from older version
alter table home_categories add column if not exists image_url text not null default '';
alter table home_categories add column if not exists href text not null default '';

-- Default seed rows (with restaurant redirect URLs)
insert into home_categories (name, emoji, image_url, href, sort_order) values
  ('Arabic',   '🫓', 'https://images.unsplash.com/photo-1607532941433-304659e8198a?w=200&h=200&q=80&auto=format&fit=crop', 'https://order.falafelalnile.com', 1),
  ('Indian',   '🍛', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&h=200&q=80&auto=format&fit=crop', 'https://www.karaksnack.com',      2),
  ('Chinese',  '🥡', 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&h=200&q=80&auto=format&fit=crop',   'https://order.twoinoneae.com',    3),
  ('Egyptian', '🧆', 'https://images.unsplash.com/photo-1574484284002-952d92a03a05?w=200&h=200&q=80&auto=format&fit=crop', 'https://order.falafelalnile.com', 4),
  ('Grilled',  '🥩', 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=200&h=200&q=80&auto=format&fit=crop', 'https://order.falafelalnile.com', 5),
  ('Sandwich', '🥪', 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=200&h=200&q=80&auto=format&fit=crop',   'https://www.miniboxae.com',       6),
  ('Pizza',    '🍕', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&q=80&auto=format&fit=crop', 'https://www.miniboxae.com',       7),
  ('Salads',   '🥗', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&q=80&auto=format&fit=crop', 'https://www.miniboxae.com',       8),
  ('Drinks',   '☕', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&q=80&auto=format&fit=crop', 'https://order.twoinoneae.com',    9),
  ('Desserts', '🍰', 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=200&h=200&q=80&auto=format&fit=crop', 'https://www.miniboxae.com',       10)
on conflict do nothing;

-- Backfill redirect URLs for existing installs (where href is still empty)
update home_categories set href = 'https://order.falafelalnile.com' where name in ('Arabic','Egyptian','Grilled') and coalesce(href,'') = '';
update home_categories set href = 'https://www.karaksnack.com'      where name = 'Indian'   and coalesce(href,'') = '';
update home_categories set href = 'https://www.miniboxae.com'       where name in ('Sandwich','Pizza','Salads','Desserts') and coalesce(href,'') = '';
update home_categories set href = 'https://order.twoinoneae.com'    where name in ('Chinese','Drinks') and coalesce(href,'') = '';
