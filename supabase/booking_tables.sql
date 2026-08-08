-- Run this in your Supabase SQL editor to create and seed the /book-table floor plan.
--
-- Everything the booking page shows about a table lives here, so admin → Book a
-- Table can correct the details a guest sees when they tap a pin. The 3D scene
-- places each pin from pos_x / pos_z, which are the coordinates measured off
-- public/floor-plan.png (x = (px/W - 0.5) * 17.8, z = (py/H - 0.5) * 13.35).

CREATE TABLE IF NOT EXISTS booking_tables (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Shown on the pin and saved with the booking, e.g. "T1", "R2", "O5".
  code           text        NOT NULL UNIQUE,
  -- One of the three areas the page tabs between; see SECTION_TO_AREA.
  section        text        NOT NULL DEFAULT 'Main Dining Hall',
  seats          text        NOT NULL DEFAULT '4',
  min_spend      integer     NOT NULL DEFAULT 0,
  -- available | limited | booked. A booked table cannot be selected.
  status         text        NOT NULL DEFAULT 'available',
  image_url      text        NOT NULL DEFAULT '',
  description    text        NOT NULL DEFAULT '',
  description_ar text        NOT NULL DEFAULT '',
  pos_x          numeric     NOT NULL DEFAULT 0,
  pos_z          numeric     NOT NULL DEFAULT 0,
  sort_order     integer     NOT NULL DEFAULT 0,
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE booking_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read booking tables" ON booking_tables;
CREATE POLICY "Public read booking tables" ON booking_tables
  FOR SELECT USING (true);

-- ─── Seed: the tables as they are drawn on the floor plan ─────────────────────
-- ON CONFLICT DO NOTHING so re-running never overwrites details typed in admin.

INSERT INTO booking_tables (code, section, seats, min_spend, status, pos_x, pos_z, sort_order) VALUES
  ('T1', 'Main Dining Hall', '4',    120, 'available', -4.13, -4.82,  1),
  ('T2', 'Main Dining Hall', '4',    120, 'available', -4.28, -3.65,  2),
  ('T3', 'Main Dining Hall', '4',    120, 'available', -4.40, -2.52,  3),
  ('T4', 'Main Dining Hall', '4',    120, 'available', -4.81, -0.01,  4),
  ('T5', 'Main Dining Hall', '2',     80, 'available', -2.30, -3.11,  5),
  ('T6', 'Main Dining Hall', '4',    120, 'available', -0.22,  0.51,  6),
  ('R1', 'VIP Majlis Area',  '8–10', 300, 'available',  1.71, -4.48,  7),
  ('R2', 'VIP Majlis Area',  '8–10', 300, 'available',  1.83, -2.79,  8),
  ('O1', 'Outdoor Terrace',  '4',    100, 'available', -6.03,  3.49,  9),
  ('O2', 'Outdoor Terrace',  '4',    100, 'available', -3.06,  3.98, 10),
  ('O3', 'Outdoor Terrace',  '6',    150, 'available', -0.07,  3.81, 11),
  ('O4', 'Outdoor Terrace',  '4',    100, 'available',  2.65,  3.37, 12),
  ('O5', 'Outdoor Terrace',  '6',    150, 'available',  0.85,  5.24, 13)
ON CONFLICT (code) DO NOTHING;
