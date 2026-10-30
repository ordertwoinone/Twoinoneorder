-- Tables for the /kitchens page popup, managed in admin → Kitchens Page → Tables.
-- Separate from booking_tables, so changing one never affects the booking page.
--
-- Safe to re-run: the starting list is copied only while this table is empty.

CREATE TABLE IF NOT EXISTS kitchen_tables (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Shown on the button and saved with each order, e.g. "T1".
  code       text        NOT NULL UNIQUE,
  section    text        NOT NULL DEFAULT '',
  section_ar text        NOT NULL DEFAULT '',
  -- Free text so a range like "8–10" works.
  seats      text        NOT NULL DEFAULT '4',
  sort_order integer     NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- No policies: reachable only through the service role, never the public key.
ALTER TABLE kitchen_tables ENABLE ROW LEVEL SECURITY;

INSERT INTO kitchen_tables (code, section, section_ar, seats, sort_order)
SELECT
  code,
  section,
  CASE section
    WHEN 'Main Dining Hall' THEN 'صالة الطعام الرئيسية'
    WHEN 'VIP Majlis Area'  THEN 'مجلس كبار الشخصيات'
    WHEN 'Outdoor Terrace'  THEN 'التراس الخارجي'
    ELSE ''
  END,
  seats,
  sort_order
FROM booking_tables
WHERE is_active
  AND NOT EXISTS (SELECT 1 FROM kitchen_tables);
