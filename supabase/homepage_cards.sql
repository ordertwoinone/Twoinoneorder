-- Homepage quick-link cards (3-card row: Table Booking, Catering, Kalba)
create table if not exists homepage_cards (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  subtitle     text not null default '',
  description  text not null default '',
  emoji        text not null default '🍽️',
  image_url    text not null default '',
  badge        text not null default '',
  button_text  text not null default 'Learn More',
  href         text not null default '/',
  accent_color text not null default '#ea580c',
  bg_from      text not null default '#fff8f2',
  bg_to        text not null default '#fdeedd',
  sort_order   int  not null default 0,
  is_active    boolean not null default true
);

insert into homepage_cards (title, subtitle, description, emoji, button_text, href, accent_color, bg_from, bg_to, badge, sort_order) values
  ('Book a Table',           'Reserve Your Spot',     'Dine in comfort. Reserve your table online in seconds and skip the wait.',      '🪑', 'Book Now',     '/book-table',                    '#16a34a', '#f0fdf4', '#dcfce7', '🍽️ Dine In',   1),
  ('Catering Services',      'Events & Gatherings',   'From corporate lunches to family celebrations — we handle the food.',           '🥘', 'Get a Quote',  '/catering',                      '#7c3aed', '#faf5ff', '#ede9fe', '🎪 Catering',   2),
  ('University Kalba',       'Made for Students',     'Student-friendly prices, free WiFi, open late and daily campus deals.',         '🎓', 'View Menu',    '/restaurant/university-kalba',   '#ea580c', '#fff8f2', '#fdeedd', '🎓 On Campus',  3)
on conflict do nothing;
