-- Telling one kiosk screen from another.
--
-- A branch runs three or four panels, and staff need to know which one took an
-- order — to reconcile a till, to work out which screen a complaint came from,
-- or to spot that the one by the entrance has been dark since Tuesday.
--
-- The screen is identified by the URL its browser is pinned to, not by a login.
-- A kiosk is an unattended box, and a session is a thing that expires: an
-- account per screen means that sooner or later a panel sits in front of
-- customers showing a password prompt, waiting for someone to walk over and
-- type credentials into a public touchscreen. A slug in the address cannot
-- expire, cannot be locked out, and is set once when the panel is installed.
--
-- That makes the slug an identifier rather than a secret — someone who knows it
-- could place an order tagged as that screen. Which is already true of /kiosk
-- itself: it is a public page, and a kiosk order is unpaid until it is
-- collected, so a forged one costs a wasted prep at worst. Locking that down is
-- a pairing token or a network restriction, not a login form.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS kiosk_devices (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- What goes in the URL: /kiosk/counter-1. Lowercase, no spaces.
  slug        text        NOT NULL UNIQUE,
  -- What staff call it: "Counter 1", "By the entrance".
  label       text        NOT NULL DEFAULT '',
  label_ar    text        NOT NULL DEFAULT '',
  -- Free text for whoever maintains the hardware: "left of the till".
  location    text        NOT NULL DEFAULT '',

  -- Off shows the closed notice on that panel alone, without touching the
  -- others — for a screen being serviced, or one moved into storage.
  is_active   boolean     NOT NULL DEFAULT true,
  sort_order  integer     NOT NULL DEFAULT 0,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- The screen looks itself up by slug on every boot.
CREATE INDEX IF NOT EXISTS kiosk_devices_slug_idx ON kiosk_devices (slug);

ALTER TABLE kiosk_devices ENABLE ROW LEVEL SECURITY;

-- ─── Which screen took the order ─────────────────────────────────────────────
-- Nullable throughout: orders placed before this ran, and any placed on the
-- unnamed /kiosk, have no device and must stay readable.
--
-- ON DELETE SET NULL rather than cascade — retiring a panel must not delete the
-- orders it took. The label is also copied onto the booking's table_section at
-- the time of the order, so the live board and the invoice keep saying which
-- screen it was even after the device row is gone.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS kiosk_device_id uuid REFERENCES kiosk_devices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_kiosk_device_idx
  ON bookings (kiosk_device_id) WHERE kiosk_device_id IS NOT NULL;
