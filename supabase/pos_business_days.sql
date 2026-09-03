-- Closing a shift and closing the day are two different acts.
--
-- They were one screen, and that was wrong in both directions. A cashier
-- finishing at four cannot hand the drawer over without signing off the whole
-- restaurant's day; and a manager closing the day at midnight was closing only
-- their own shift, so the morning's takings never appeared in anything anybody
-- called a daily total.
--
--   Shift close — one person, one drawer. Count it, hand it over, go home.
--                 The restaurant keeps trading under the next shift.
--   Day close   — one restaurant, one business day. Every shift closed, every
--                 order settled, the combined figures signed off by a manager.
--                 The next order opens a new business day.
--
-- Sales from both shifts appear once in the daily total, because the day's
-- figures are summed from the shifts rather than recounted from the orders.
--
-- Safe to re-run.

-- ─── Which day a shift belongs to ────────────────────────────────────────────
-- Not the calendar date of opened_at. An evening shift that runs to half past
-- one belongs to the day it started, and a day close at 2am that left those
-- orders out is exactly the hole this column exists to fill. See
-- businessDateFor() in lib/pos/business-day.ts for the cutoff.

ALTER TABLE pos_shifts
  ADD COLUMN IF NOT EXISTS business_date date;

-- Existing shifts, dated by the same rule the code applies from here on.
UPDATE pos_shifts
   SET business_date = (opened_at AT TIME ZONE 'Asia/Dubai' - interval '5 hours')::date
 WHERE business_date IS NULL;

CREATE INDEX IF NOT EXISTS pos_shifts_business_date_idx
  ON pos_shifts (business_date, opened_at);

-- ─── The day itself ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pos_business_days (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- One row per trading day. The unique constraint is the lock: two managers
  -- closing at once cannot produce two daily totals for the same date.
  business_date  date        NOT NULL UNIQUE,
  status         text        NOT NULL DEFAULT 'closed',

  closed_at      timestamptz NOT NULL DEFAULT now(),
  closed_by      uuid        REFERENCES pos_staff(id) ON DELETE SET NULL,

  -- Summed from the shifts that made up the day, frozen at sign-off so a later
  -- refund cannot rewrite a total somebody has already reported.
  shift_count    integer       NOT NULL DEFAULT 0,
  order_count    integer       NOT NULL DEFAULT 0,
  gross_sales    numeric(10,2) NOT NULL DEFAULT 0,
  discount_total numeric(10,2) NOT NULL DEFAULT 0,
  refund_total   numeric(10,2) NOT NULL DEFAULT 0,
  vat_total      numeric(10,2) NOT NULL DEFAULT 0,
  net_sales      numeric(10,2) NOT NULL DEFAULT 0,
  cash_sales     numeric(10,2) NOT NULL DEFAULT 0,
  card_sales     numeric(10,2) NOT NULL DEFAULT 0,
  online_sales   numeric(10,2) NOT NULL DEFAULT 0,
  expense_total  numeric(10,2) NOT NULL DEFAULT 0,

  -- The drawer side, added up across every shift that was counted.
  expected_cash  numeric(10,2) NOT NULL DEFAULT 0,
  counted_cash   numeric(10,2) NOT NULL DEFAULT 0,
  difference     numeric(10,2) NOT NULL DEFAULT 0,

  note           text        NOT NULL DEFAULT '',
  -- The report as it was signed off, so it can be reprinted word for word.
  report         text        NOT NULL DEFAULT '',

  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pos_business_days_date_idx
  ON pos_business_days (business_date DESC);

ALTER TABLE pos_business_days ENABLE ROW LEVEL SECURITY;
