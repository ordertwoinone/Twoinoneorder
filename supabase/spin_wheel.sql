-- Run this in your Supabase SQL editor to create and seed the Spin & Win offer wheel

-- ─── Wheel settings / conditions (single row) ───────────────────────────────
CREATE TABLE IF NOT EXISTS spin_wheel_settings (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled      boolean     NOT NULL DEFAULT false,          -- master on/off
  title           text        NOT NULL DEFAULT 'Spin & Win!',
  subtitle        text        NOT NULL DEFAULT 'Try your luck and grab an exclusive offer',
  button_label    text        NOT NULL DEFAULT 'Spin & Win',   -- floating button text
  spin_label      text        NOT NULL DEFAULT 'SPIN',         -- centre hub text
  win_message     text        NOT NULL DEFAULT 'Congratulations! 🎉 You won',
  lose_message    text        NOT NULL DEFAULT 'So close! Better luck next time.',
  cooldown_hours  integer     NOT NULL DEFAULT 24,             -- how often a visitor may spin (0 = unlimited)
  require_email   boolean     NOT NULL DEFAULT false,          -- ask for email before spinning
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── Wheel slices / contents ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spin_wheel_segments (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  label       text        NOT NULL DEFAULT '',          -- text on the slice, e.g. "10% OFF"
  code        text        NOT NULL DEFAULT '',          -- prize/coupon code revealed on win (blank = no prize / "try again")
  color       text        NOT NULL DEFAULT '#ea580c',   -- slice fill colour
  weight      integer     NOT NULL DEFAULT 1,           -- relative win probability (0 = never lands here)
  is_winning  boolean     NOT NULL DEFAULT true,        -- false = "no luck" slice
  is_active   boolean     NOT NULL DEFAULT true,
  usage_limit integer     NOT NULL DEFAULT 0,           -- max times this prize can be won (0 = unlimited)
  times_won   integer     NOT NULL DEFAULT 0,           -- how many times it has been awarded so far
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ─── Captured entries (email + the prize they won) ──────────────────────────
CREATE TABLE IF NOT EXISTS spin_wheel_entries (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email        text        NOT NULL DEFAULT '',
  prize_label  text        NOT NULL DEFAULT '',
  prize_code   text        NOT NULL DEFAULT '',
  is_winning   boolean     NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spin_wheel_entries_created_idx ON spin_wheel_entries (created_at DESC);

-- Accessed server-side via the service role key (bypasses RLS).
ALTER TABLE spin_wheel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE spin_wheel_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE spin_wheel_entries  ENABLE ROW LEVEL SECURITY;

-- ─── Seed ───────────────────────────────────────────────────────────────────
INSERT INTO spin_wheel_settings (is_enabled) VALUES (false);

INSERT INTO spin_wheel_segments (label, code, color, weight, is_winning, sort_order) VALUES
  ('10% OFF',        'SPIN10',   '#ea580c', 3, true,  1),
  ('Free Delivery',  'FREEDEL',  '#16a34a', 3, true,  2),
  ('Try Again',      '',         '#64748b', 4, false, 3),
  ('5% OFF',         'SPIN5',    '#2563eb', 3, true,  4),
  ('Free Karak',     'KARAK',    '#db2777', 1, true,  5),
  ('Try Again',      '',         '#475569', 4, false, 6),
  ('15% OFF',        'SPIN15',   '#9333ea', 1, true,  7),
  ('Free Dessert',   'SWEET',    '#ca8a04', 2, true,  8);
