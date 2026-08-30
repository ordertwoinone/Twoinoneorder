-- Running the till: what it charges, what it parks, and what it pays out.
--
-- Builds on supabase/pos.sql, which holds the staff, sessions and shifts.
-- Safe to re-run.

-- ─── How the till behaves (single row) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS pos_settings (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- The letters before the order number, as printed and read out: "ORD-1048".
  order_prefix          text        NOT NULL DEFAULT 'ORD',

  -- Added to a delivery order. Waived above the threshold; 0 threshold never waives.
  delivery_charge       numeric(10,2) NOT NULL DEFAULT 10,
  free_delivery_over    numeric(10,2) NOT NULL DEFAULT 0,

  /* A cashier can knock money off, up to here. Past it a manager has to
     approve, which is the whole reason roles exist on a till. */
  max_cashier_discount_percent integer NOT NULL DEFAULT 10,
  -- Any expense at or above this needs a manager too.
  manager_expense_over  numeric(10,2) NOT NULL DEFAULT 500,

  -- What the drawer is supposed to start the day with.
  expected_float        numeric(10,2) NOT NULL DEFAULT 500,

  -- Where the day-close summary is sent. Blank sends nowhere.
  whatsapp_report_to    text        NOT NULL DEFAULT '',
  whatsapp_report_label text        NOT NULL DEFAULT 'Management',
  whatsapp_auto_send    boolean     NOT NULL DEFAULT false,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ─── Orders put down and picked up again ─────────────────────────────────────
-- "Hold Order": a basket parked while the customer decides, or the card is
-- fetched from the car. Not a booking — nothing has been ordered yet, and a
-- held basket that showed up in Order History would be a sale that never was.

CREATE TABLE IF NOT EXISTS pos_parked_orders (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_uuid   uuid        NOT NULL REFERENCES pos_staff(id) ON DELETE CASCADE,
  shift_id     uuid        REFERENCES pos_shifts(id) ON DELETE SET NULL,
  -- What the cashier will recognise it by: a name, a table, "blue jacket".
  label        text        NOT NULL DEFAULT '',
  -- The whole basket as the screen had it: qty, add-ons, customer, order type.
  payload      jsonb       NOT NULL DEFAULT '{}',
  -- Shown on the parked list so it can be picked without opening it.
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  item_count   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pos_parked_staff_idx ON pos_parked_orders (staff_uuid, created_at DESC);

-- ─── Money out of the drawer ─────────────────────────────────────────────────
-- Paid out during a shift: a delivery driver's fuel, cleaning supplies, a
-- small repair. Cash expenses come off the drawer at close; card and transfer
-- are recorded but do not touch it.

CREATE TABLE IF NOT EXISTS pos_expenses (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id       uuid        REFERENCES pos_shifts(id) ON DELETE SET NULL,
  staff_uuid     uuid        REFERENCES pos_staff(id) ON DELETE SET NULL,

  category       text        NOT NULL DEFAULT '',
  description    text        NOT NULL DEFAULT '',
  supplier       text        NOT NULL DEFAULT '',
  reference      text        NOT NULL DEFAULT '',
  amount         numeric(10,2) NOT NULL DEFAULT 0,
  -- 'cash' | 'card' | 'transfer'. Only cash is taken off the drawer.
  payment_method text        NOT NULL DEFAULT 'cash',
  vat_included   boolean     NOT NULL DEFAULT false,
  receipt_url    text        NOT NULL DEFAULT '',
  note           text        NOT NULL DEFAULT '',
  -- Who waved through an expense over the threshold, if one was needed.
  approved_by    uuid        REFERENCES pos_staff(id) ON DELETE SET NULL,

  spent_at       timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pos_expenses_shift_idx ON pos_expenses (shift_id, spent_at DESC);

-- The categories the expense form offers. Editable, because every branch
-- spends money on something the last one did not.
CREATE TABLE IF NOT EXISTS pos_expense_categories (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  label      text        NOT NULL UNIQUE,
  sort_order integer     NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── What the day close recorded ─────────────────────────────────────────────
-- Counted at close and worked out from the orders, side by side, so the
-- reconciliation can be reprinted later exactly as it was signed off.

ALTER TABLE pos_shifts
  ADD COLUMN IF NOT EXISTS gross_sales     numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_total  numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_total    numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_total       numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_sales       numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_sales      numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_sales      numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS online_sales    numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expense_total   numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_count     integer       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closed_by       uuid REFERENCES pos_staff(id) ON DELETE SET NULL;

ALTER TABLE pos_settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_parked_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_expense_categories ENABLE ROW LEVEL SECURITY;

-- ─── Seed ────────────────────────────────────────────────────────────────────

INSERT INTO pos_settings (order_prefix)
SELECT 'ORD' WHERE NOT EXISTS (SELECT 1 FROM pos_settings);

INSERT INTO pos_expense_categories (label, sort_order) VALUES
  ('Cleaning Supplies', 1),
  ('Delivery Fuel',     2),
  ('Maintenance',       3),
  ('Kitchen Supplies',  4),
  ('Staff Meals',       5),
  ('Utilities',         6),
  ('Other',             99)
ON CONFLICT (label) DO NOTHING;
