-- Run this in your Supabase SQL editor to create and seed the University Kalba page tables

-- ─── Create Tables ────────────────────────────────────────────────────────────

-- Branch header info + student banner (single row)
CREATE TABLE IF NOT EXISTS kalba_hero (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name             text        NOT NULL DEFAULT 'Two in One University Kalba',
  location         text        NOT NULL DEFAULT 'Near University of Kalba, Kalba',
  maps_url         text        NOT NULL DEFAULT 'https://www.google.com/maps/search/?api=1&query=University+City+Kalba+Sharjah',
  whatsapp         text        NOT NULL DEFAULT '971522305216',
  rating           text        NOT NULL DEFAULT '4.6',
  rating_count     text        NOT NULL DEFAULT '500+',
  delivery_time    text        NOT NULL DEFAULT '15–25 min',
  delivery_fee     text        NOT NULL DEFAULT 'Free delivery',
  is_open          boolean     NOT NULL DEFAULT true,
  closes_at        text        NOT NULL DEFAULT '12:00 AM',
  student_title    text        NOT NULL DEFAULT 'Are you a student?',
  student_subtitle text        NOT NULL DEFAULT 'Unlock exclusive student deals & discounts',
  student_button   text        NOT NULL DEFAULT 'Verify Student',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Hero banner with info chips (single row; chips = [{emoji, line1, line2}])
CREATE TABLE IF NOT EXISTS kalba_banner (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title           text        NOT NULL DEFAULT 'Made for Students,',
  title_highlight text        NOT NULL DEFAULT 'Loved by Everyone!',
  subtitle        text        NOT NULL DEFAULT 'Great food. Better prices. Right on campus.',
  image_url       text        NOT NULL DEFAULT '',
  chips           jsonb       NOT NULL DEFAULT '[]',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kalba_categories (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  emoji      text        NOT NULL DEFAULT '🍔',
  label      text        NOT NULL DEFAULT '',
  sort_order integer     NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kalba_popular_items (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL DEFAULT '',
  price      text        NOT NULL DEFAULT '',
  rating     text        NOT NULL DEFAULT '4.5',
  time_text  text        NOT NULL DEFAULT '15–20 min',
  image_url  text        NOT NULL DEFAULT '',
  sort_order integer     NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Study & Chill card (single row; features = [{icon, label}])
CREATE TABLE IF NOT EXISTS kalba_study (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text        NOT NULL DEFAULT 'Study & Chill',
  subtitle    text        NOT NULL DEFAULT 'The perfect place to eat, study and hangout.',
  image_url   text        NOT NULL DEFAULT '',
  button_text text        NOT NULL DEFAULT 'Visit Store',
  features    jsonb       NOT NULL DEFAULT '[]',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kalba_daily_deals (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  day         text        NOT NULL DEFAULT '',
  title       text        NOT NULL DEFAULT '',
  description text        NOT NULL DEFAULT '',
  emoji       text        NOT NULL DEFAULT '🍔',
  bg_color    text        NOT NULL DEFAULT '#ecfdf5',
  day_color   text        NOT NULL DEFAULT '#16a34a',
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- University specials (empty price_text = show "Order Now" button instead)
CREATE TABLE IF NOT EXISTS kalba_specials (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL DEFAULT '',
  description text        NOT NULL DEFAULT '',
  price_text  text        NOT NULL DEFAULT '',
  image_url   text        NOT NULL DEFAULT '',
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Tables are only accessed server-side via the service role key, which bypasses RLS.
-- Enabling RLS with no policies blocks any direct access with the public anon key.
ALTER TABLE kalba_hero          ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalba_banner        ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalba_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalba_popular_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalba_study         ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalba_daily_deals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalba_specials      ENABLE ROW LEVEL SECURITY;

-- ─── Seed: Hero / Branch Info ────────────────────────────────────────────────

INSERT INTO kalba_hero (name) VALUES ('Two in One University Kalba');

-- ─── Seed: Hero Banner ───────────────────────────────────────────────────────

INSERT INTO kalba_banner (title, title_highlight, subtitle, image_url, chips)
VALUES (
  'Made for Students,',
  'Loved by Everyone!',
  'Great food. Better prices. Right on campus.',
  'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=1200&q=80&auto=format&fit=crop',
  '[
    {"emoji": "🎓", "line1": "Student Friendly", "line2": "Pricing"},
    {"emoji": "☕", "line1": "Breakfast from", "line2": "AED 5"},
    {"emoji": "🍔", "line1": "Lunch Combos from", "line2": "AED 12"},
    {"emoji": "📶", "line1": "Free", "line2": "WiFi"}
  ]'::jsonb
);

-- ─── Seed: Categories ────────────────────────────────────────────────────────

INSERT INTO kalba_categories (emoji, label, sort_order, is_active) VALUES
  ('🎓', 'Student Meals',  1, true),
  ('☕', 'Coffee & Karak', 2, true),
  ('🥪', 'Quick Bites',    3, true),
  ('🍔', 'Burgers',        4, true),
  ('🌯', 'Shawarma',       5, true),
  ('🍟', 'Snacks',         6, true),
  ('🥤', 'Drinks',         7, true),
  ('🎁', 'Combo Deals',    8, true);

-- ─── Seed: Popular Items ─────────────────────────────────────────────────────

INSERT INTO kalba_popular_items (name, price, rating, time_text, image_url, sort_order, is_active) VALUES
  ('Student Breakfast Box',   '5',  '4.6', '15–20 min', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80&auto=format&fit=crop', 1, true),
  ('Karak + Samosa',          '3',  '4.5', '10–15 min', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80&auto=format&fit=crop', 2, true),
  ('Chicken Shawarma Combo',  '12', '4.7', '20–25 min', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80&auto=format&fit=crop', 3, true),
  ('Zinger Combo',            '15', '4.8', '20–25 min', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&q=80&auto=format&fit=crop', 4, true),
  ('Mini Burger Meal',        '10', '4.6', '20–25 min', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&auto=format&fit=crop', 5, true),
  ('Student Lunch Box',       '18', '4.7', '20–25 min', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80&auto=format&fit=crop', 6, true);

-- ─── Seed: Study & Chill ─────────────────────────────────────────────────────

INSERT INTO kalba_study (title, subtitle, image_url, button_text, features)
VALUES (
  'Study & Chill',
  'The perfect place to eat, study and hangout.',
  'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1200&q=80&auto=format&fit=crop',
  'Visit Store',
  '[
    {"icon": "Wifi",            "label": "Free WiFi"},
    {"icon": "BatteryCharging", "label": "Charging Points"},
    {"icon": "Armchair",        "label": "Indoor Seating"},
    {"icon": "Users",           "label": "Group Tables"},
    {"icon": "MoonStar",        "label": "Open Late"}
  ]'::jsonb
);

-- ─── Seed: Daily Deals ───────────────────────────────────────────────────────

INSERT INTO kalba_daily_deals (day, title, description, emoji, bg_color, day_color, sort_order, is_active) VALUES
  ('Monday',    'Burger Day',      'Up to 25% OFF',      '🍔',  '#ecfdf5', '#16a34a', 1, true),
  ('Tuesday',   'Shawarma Day',    'Up to 20% OFF',      '🌯',  '#fefce8', '#ca8a04', 2, true),
  ('Wednesday', 'Karak Combo Day', 'AED 5 Karak Combo',  '☕',  '#fdf2f8', '#db2777', 3, true),
  ('Thursday',  'Student Feast',   'Special Combos',     '🍽️', '#eff6ff', '#2563eb', 4, true),
  ('Friday',    'Family Combo',    'Up to 30% OFF',      '👨‍👩‍👧', '#faf5ff', '#9333ea', 5, true);

-- ─── Seed: University Specials ───────────────────────────────────────────────

INSERT INTO kalba_specials (name, description, price_text, image_url, sort_order, is_active) VALUES
  ('Exam Week Combo',      'Power up your study sessions',   'From AED 15', 'https://images.unsplash.com/photo-1550317138-10000687a72b?w=600&q=80&auto=format&fit=crop', 1, true),
  ('Midnight Study Pack',  'Available from 10 PM – 12 AM',   'From AED 12', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80&auto=format&fit=crop', 2, true),
  ('Graduation Catering',  'Make your day special',          '',            'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&q=80&auto=format&fit=crop', 3, true),
  ('Club Meeting Platters', 'Perfect for groups',            '',            'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80&auto=format&fit=crop', 4, true),
  ('Student Bundle',       'Best value for students',        'From AED 20', 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600&q=80&auto=format&fit=crop', 5, true);
