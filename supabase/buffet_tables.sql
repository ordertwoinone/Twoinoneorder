-- Run this in your Supabase SQL editor to create and seed the buffet page tables

-- ─── Create Tables ────────────────────────────────────────────────────────────

-- Buffet hero / restaurant info header (single row)
CREATE TABLE IF NOT EXISTS buffet_hero (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_name text        NOT NULL DEFAULT 'Buffet By Two In One',
  cuisine         text        NOT NULL DEFAULT 'Buffet · International',
  rating          text        NOT NULL DEFAULT '4.6',
  rating_count    text        NOT NULL DEFAULT '2.1K+',
  delivery_time   text        NOT NULL DEFAULT '20–30 min',
  delivery_fee    text        NOT NULL DEFAULT 'KD 0.600 delivery',
  is_open         boolean     NOT NULL DEFAULT true,
  closes_at       text        NOT NULL DEFAULT '11:30 PM',
  cover_image_url text        NOT NULL DEFAULT '',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buffet_banners (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text        NOT NULL DEFAULT '',
  title_highlight text     NOT NULL DEFAULT '',
  subtitle     text        NOT NULL DEFAULT '',
  price        text        NOT NULL DEFAULT '',
  price_label  text        NOT NULL DEFAULT '/ person',
  cta_text     text        NOT NULL DEFAULT 'Book a Table',
  bg_color     text        NOT NULL DEFAULT '#FFF5EE',
  accent_color text        NOT NULL DEFAULT '#ea580c',
  image_url    text        NOT NULL DEFAULT '',
  sort_order   integer     NOT NULL DEFAULT 0,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buffet_why_choose_us (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  icon_name  text        NOT NULL DEFAULT 'Star',
  label      text        NOT NULL DEFAULT '',
  sub_label  text        NOT NULL DEFAULT '',
  sort_order integer     NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buffet_timings (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  label       text        NOT NULL DEFAULT '',
  time_range  text        NOT NULL DEFAULT '',
  price       text        NOT NULL DEFAULT '',
  price_label text        NOT NULL DEFAULT '/ person',
  theme       text        NOT NULL DEFAULT 'orange',
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buffet_popular_dishes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL DEFAULT '',
  tag        text        NOT NULL DEFAULT '',
  image_url  text        NOT NULL DEFAULT '',
  is_veg     boolean     NOT NULL DEFAULT false,
  sort_order integer     NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─── Seed: Buffet Banners ─────────────────────────────────────────────────────

INSERT INTO buffet_banners (title, title_highlight, subtitle, price, price_label, cta_text, bg_color, accent_color, image_url, sort_order, is_active)
VALUES (
  'All you can eat,',
  'Endless choices!',
  'Enjoy 100+ dishes from multiple cuisines.',
  'KD 6.900',
  '/ person',
  'Book a Table',
  '#FFF5EE',
  '#ea580c',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&q=85',
  1,
  true
);

-- ─── Seed: Why Choose Us ──────────────────────────────────────────────────────

INSERT INTO buffet_why_choose_us (icon_name, label, sub_label, sort_order, is_active) VALUES
  ('UtensilsCrossed', '100+ Dishes',      'Per Session',   1, true),
  ('Globe',           'Multi Cuisine',    'World Flavors', 2, true),
  ('Flame',           'Freshly Prepared', 'Every Hour',    3, true),
  ('Smile',           'Great Ambience',   '& Comfort',     4, true),
  ('Car',             'Free Parking',     'Available',     5, true);

-- ─── Seed: Buffet Timings ─────────────────────────────────────────────────────

INSERT INTO buffet_timings (label, time_range, price, price_label, theme, sort_order, is_active) VALUES
  ('Lunch Buffet',   '12:00 PM – 4:00 PM',  'KD 6.900', '/ person', 'orange', 1, true),
  ('Dinner Buffet',  '6:00 PM – 11:00 PM',  'KD 7.900', '/ person', 'violet', 2, true),
  ('Weekend Brunch', '11:00 AM – 4:00 PM',  'KD 7.900', '/ person', 'pink',   3, true);

-- ─── Seed: Popular Dishes ─────────────────────────────────────────────────────

INSERT INTO buffet_popular_dishes (name, tag, image_url, is_veg, sort_order, is_active) VALUES
  ('Grilled Salmon', 'Chef''s Special', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80', false, 1, true),
  ('Butter Chicken', 'Bestseller',      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80', false, 2, true),
  ('Caesar Salad',   'Healthy Pick',    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',   true,  3, true),
  ('Beef Biryani',   'Chef''s Special', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80', false, 4, true),
  ('Choc Fountain',  'Sweet Treat',     'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80',   true,  5, true);

-- ─── Seed: Buffet Hero ────────────────────────────────────────────────────────

INSERT INTO buffet_hero (restaurant_name, cuisine, rating, rating_count, delivery_time, delivery_fee, is_open, closes_at, cover_image_url)
VALUES (
  'Buffet By Two In One',
  'Buffet · International',
  '4.6',
  '2.1K+',
  '20–30 min',
  'KD 0.600 delivery',
  true,
  '11:30 PM',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=700&q=85'
);
