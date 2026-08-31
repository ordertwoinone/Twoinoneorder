-- The self-order kiosk: the screen standing in the branch, and what it sells.
--
-- The kiosk does NOT carry a menu of its own. It sells the University Kalba
-- menu — kalba_categories and kalba_popular_items, the same rows the branch
-- page and the /menu page read — so a price changed once is right on all
-- three. What lives here is only the things that are the kiosk's own: how the
-- idle screen looks, and how the flow behaves.
--
-- An order taken at the kiosk is a booking with type = 'kiosk', so it lands in
-- Order History, prints on the same tax invoice, and counts on the dashboard
-- alongside every other order. admin → Kiosk → Orders is that same table,
-- filtered.
--
-- Safe to re-run.

-- ─── The screen's own settings (single row) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS kiosk_settings (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- What the kiosk calls itself, under the logo on every screen.
  brand_name          text        NOT NULL DEFAULT 'TWO IN ONE',
  brand_subtitle      text        NOT NULL DEFAULT 'UNIVERSITY KALBA',
  logo_url            text        NOT NULL DEFAULT '',

  -- The idle screen. Wording only: the artwork is one row per ad, below.
  order_button_text   text        NOT NULL DEFAULT 'ORDER NOW',
  order_button_text_ar text       NOT NULL DEFAULT '',
  touch_hint          text        NOT NULL DEFAULT 'Touch to begin',
  touch_hint_ar       text        NOT NULL DEFAULT '',
  privilege_strip     text        NOT NULL DEFAULT 'Privilege Card Members Get 10% OFF',
  privilege_strip_ar  text        NOT NULL DEFAULT '',

  -- The combo banner across the top of the menu screen. combo_item_ids are
  -- kalba_popular_items ids: pressing "Add Combo" drops all of them in at once.
  combo_enabled       boolean     NOT NULL DEFAULT true,
  combo_title         text        NOT NULL DEFAULT 'Campus Combo',
  combo_title_ar      text        NOT NULL DEFAULT '',
  combo_subtitle      text        NOT NULL DEFAULT 'Burger + Fries + Drink',
  combo_subtitle_ar   text        NOT NULL DEFAULT '',
  combo_price         numeric(10,2) NOT NULL DEFAULT 19,
  combo_save          numeric(10,2) NOT NULL DEFAULT 6,
  combo_image_url     text        NOT NULL DEFAULT '',
  combo_item_ids      jsonb       NOT NULL DEFAULT '[]',

  -- What the confirmation screen promises, and where to collect.
  ready_minutes_min   integer     NOT NULL DEFAULT 12,
  ready_minutes_max   integer     NOT NULL DEFAULT 15,
  pickup_counter      text        NOT NULL DEFAULT 'University Kalba Counter',
  pickup_counter_ar   text        NOT NULL DEFAULT '',

  -- The letters before the order number on screen and on the receipt. The
  -- number itself is the booking's own order_number, so "TIO-1048" is the same
  -- order staff see in Order History as #1048.
  order_prefix        text        NOT NULL DEFAULT 'TIO',

  -- Seconds the confirmation screen holds before it clears itself, and how
  -- long an abandoned order sits mid-flow before the kiosk goes back to idle.
  -- 0 on either one turns that timer off.
  reset_seconds       integer     NOT NULL DEFAULT 30,
  idle_timeout_seconds integer    NOT NULL DEFAULT 90,

  -- The Student Privilege Card step. The percentage is the card's own; this is
  -- only what the idle strip advertises and whether the step is offered at all.
  privilege_enabled   boolean     NOT NULL DEFAULT true,

  -- Whether the kiosk asks for a phone number, and how it may send the receipt.
  phone_enabled       boolean     NOT NULL DEFAULT true,
  sms_receipt_enabled boolean     NOT NULL DEFAULT true,
  whatsapp_receipt_enabled boolean NOT NULL DEFAULT true,

  -- Off means the screen shows a "closed" notice instead of taking orders.
  is_live             boolean     NOT NULL DEFAULT true,
  closed_message      text        NOT NULL DEFAULT 'The kiosk is closed right now. Please order at the counter.',
  closed_message_ar   text        NOT NULL DEFAULT '',

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── The idle screen's rotating ads ──────────────────────────────────────────
-- One row per slide. A video slide plays muted and loops for its duration; an
-- image slide just holds. The screen shows "Ad 1 of 3" against these.

CREATE TABLE IF NOT EXISTS kiosk_ads (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  -- 'video' or 'image'.
  media_type    text        NOT NULL DEFAULT 'video',
  media_url     text        NOT NULL DEFAULT '',
  -- Shown while a video is still loading, so the screen is never black.
  poster_url    text        NOT NULL DEFAULT '',
  headline      text        NOT NULL DEFAULT '',
  headline_ar   text        NOT NULL DEFAULT '',
  subline       text        NOT NULL DEFAULT '',
  subline_ar    text        NOT NULL DEFAULT '',
  -- Seconds before moving to the next slide. A video with 0 runs its full
  -- length; an image with 0 falls back to eight seconds.
  duration_seconds integer  NOT NULL DEFAULT 0,
  sort_order    integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kiosk_ads_order_idx ON kiosk_ads (sort_order) WHERE is_active;

-- Read server-side with the service role, which bypasses RLS. On with no
-- policies means nothing can reach them with the public anon key.
ALTER TABLE kiosk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_ads      ENABLE ROW LEVEL SECURITY;

-- ─── What a kiosk order records beyond an ordinary one ───────────────────────
-- How the customer asked for their receipt, e.g. {sms, whatsapp}. Empty is the
-- normal case: most people take the number and walk away.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS receipt_channels text[] NOT NULL DEFAULT '{}';

-- ─── Seed ────────────────────────────────────────────────────────────────────

INSERT INTO kiosk_settings (brand_name)
SELECT 'TWO IN ONE'
WHERE NOT EXISTS (SELECT 1 FROM kiosk_settings);

-- ─── Taking a delivery order at the screen ───────────────────────────────────
-- The kiosk stands inside the branch, so collection is the common case and
-- stays the default. Delivery is opt-in per branch: a screen in a food court
-- that does not deliver should not be offering it.
--
-- The charge is applied on top of the food and is never discounted — a
-- percentage off a customer's bill should not quietly come off the driver's fee.

ALTER TABLE kiosk_settings
  ADD COLUMN IF NOT EXISTS delivery_enabled    boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_charge     numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_delivery_over  numeric(10,2) NOT NULL DEFAULT 0,
  -- Shown under the delivery option, e.g. "Within 5km, 30–45 minutes".
  ADD COLUMN IF NOT EXISTS delivery_note       text          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_note_ar    text          NOT NULL DEFAULT '';
