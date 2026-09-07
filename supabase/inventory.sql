-- Stock control: what is on the shelf, what moved, and what a count found.
--
-- The whole thing rests on one idea: inventory_movements is the truth, and
-- every other number on the screen is derived from it. Stock on hand is not a
-- column anybody edits — it is the sum of every movement ever recorded for an
-- item. That is what makes the figures defensible: a shortage can always be
-- walked back to the rows that caused it, and there is no "quantity" field that
-- can quietly drift out of step with its own history.
--
-- So a delivery, a case sent to the bar, a dropped bottle, and the correction
-- after a physical count are all the same shape of row, differing only in kind.
--
--   Book closing = opening + goods received - consumed - write-offs - waste
--
-- and opening is itself just the balance of everything dated before the day
-- being counted. Nothing is stored twice.
--
-- Safe to re-run.

-- ─── What is stocked ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_items (
  id            uuid          DEFAULT gen_random_uuid() PRIMARY KEY,

  name          text          NOT NULL DEFAULT '',
  name_ar       text          NOT NULL DEFAULT '',
  -- Whatever the branch writes on the shelf label. Not required, but unique
  -- when given, so two rows cannot claim the same code.
  sku           text,
  category      text          NOT NULL DEFAULT 'Uncategorised',
  -- The unit everything is counted in: Can, Bottle, Pack, Kg, Litre.
  uom           text          NOT NULL DEFAULT 'Unit',
  -- Which branch or store room. Free text; the filters read whatever is here.
  location      text          NOT NULL DEFAULT '',

  /* Cost is what the stock is carried at, NRV is what it could still be sold
     for net of getting it there. IAS 2 measures at the lower of the two, so
     both are kept and the valuation takes whichever is smaller — a crate of
     drinks a fortnight from expiry is worth its clearance price, not what was
     paid for it. */
  unit_cost     numeric(12,4) NOT NULL DEFAULT 0,
  nrv           numeric(12,4) NOT NULL DEFAULT 0,

  -- Below this the valuation screen flags it. 0 turns the flag off.
  reorder_level numeric(12,3) NOT NULL DEFAULT 0,

  image_url     text          NOT NULL DEFAULT '',
  is_active     boolean       NOT NULL DEFAULT true,
  sort_order    integer       NOT NULL DEFAULT 0,

  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_sku_idx
  ON inventory_items (lower(sku)) WHERE sku IS NOT NULL AND sku <> '';

CREATE INDEX IF NOT EXISTS inventory_items_category_idx ON inventory_items (category);

-- ─── The count sheet ─────────────────────────────────────────────────────────
-- One row per stock-take: a date, a place, and the state it is in. A draft can
-- be typed into over a shift and left; posting it freezes the variances into
-- the ledger and closes it.

CREATE TABLE IF NOT EXISTS inventory_counts (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- SC-2026-0906-001. Printed on the sheet and quoted when anyone asks.
  reference   text        NOT NULL DEFAULT '',
  count_date  date        NOT NULL DEFAULT current_date,
  location    text        NOT NULL DEFAULT '',

  -- 'draft' while it is being typed, 'posted' once the variances are in the
  -- ledger. A posted count is history and is not edited again.
  status      text        NOT NULL DEFAULT 'draft',

  entered_by  text        NOT NULL DEFAULT '',
  notes       text        NOT NULL DEFAULT '',

  posted_at   timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

/* One count per place per day. Two people opening the sheet at once must land
   on the same one rather than each starting their own and overwriting the
   other's numbers. COALESCE because the location may be blank. */
CREATE UNIQUE INDEX IF NOT EXISTS inventory_counts_day_idx
  ON inventory_counts (count_date, COALESCE(location, ''));

-- ─── What was on the shelf ───────────────────────────────────────────────────
-- The counted figure, kept apart from the ledger because it is an observation,
-- not a movement. The movement is what posting the count writes afterwards.

CREATE TABLE IF NOT EXISTS inventory_count_lines (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  count_id        uuid          NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
  item_id         uuid          NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,

  -- NULL means nobody has counted this one yet, which is not the same as
  -- counting it and finding none. The sheet shows the two differently.
  physical_count  numeric(12,3),

  /* Filled in at posting: what the books said, what it was worth, and what the
     item cost that day. Snapshots on purpose — re-pricing an item next month
     must not rewrite what a count found last month. */
  book_closing    numeric(12,3),
  variance        numeric(12,3),
  unit_cost       numeric(12,4),
  nrv             numeric(12,4),

  note            text          NOT NULL DEFAULT '',

  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- One line per item per count; the sheet upserts on it.
CREATE UNIQUE INDEX IF NOT EXISTS inventory_count_lines_unique_idx
  ON inventory_count_lines (count_id, item_id);

-- ─── Every movement ──────────────────────────────────────────────────────────
-- The ledger. Nothing else in this schema stores a quantity on hand.

CREATE TABLE IF NOT EXISTS inventory_movements (
  id             uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id        uuid          NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,

  movement_date  date          NOT NULL DEFAULT current_date,

  /* opening          — the balance the item started life with
     received         — a delivery in
     consumed         — issued to the bar, sold, used
     writeoff         — damaged, expired, written off the books
     waste            — spilled, spoiled, thrown
     count_adjustment — the correction a posted stock-take made */
  kind           text          NOT NULL,

  /* Always the magnitude, never a signed figure — a delivery of 24 and a
     consumption of 24 both store 24, and which way it moves is the kind's job.
     The one exception is count_adjustment, which is signed because a count can
     go either way, and which way it went is the whole point of it. */
  quantity       numeric(12,3) NOT NULL DEFAULT 0,

  -- What the item cost at the time, so the ledger keeps its own valuation
  -- rather than re-reading today's price for last quarter's delivery.
  unit_cost      numeric(12,4) NOT NULL DEFAULT 0,

  -- Damaged / Expired / Spillage for a write-off; the supplier or a note
  -- otherwise. Required by the screen for write-offs and waste: a quantity
  -- taken off the books without a reason is not something anyone can audit.
  reason         text          NOT NULL DEFAULT '',
  -- WO-2026-0041, a delivery note number, an invoice.
  reference      text          NOT NULL DEFAULT '',
  note           text          NOT NULL DEFAULT '',

  -- Set on the adjustments a posted count wrote, so they can be traced back to
  -- the sheet that caused them. SET NULL: deleting a count must not delete the
  -- history it corrected.
  count_id       uuid          REFERENCES inventory_counts(id) ON DELETE SET NULL,

  entered_by     text          NOT NULL DEFAULT '',

  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_movements_item_date_idx
  ON inventory_movements (item_id, movement_date);
CREATE INDEX IF NOT EXISTS inventory_movements_date_idx
  ON inventory_movements (movement_date DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_kind_idx
  ON inventory_movements (kind);

/* The count sheet edits a day's received and consumed figures in place — typing
   26 where it said 24 must correct that day's delivery, not book a second one.
   These two indexes let the sheet upsert: at most one hand-typed received row
   and one consumed row per item per day. Write-offs and waste are deliberately
   left out, because each one is its own incident with its own reason and they
   must stay as separate rows in the register. */
CREATE UNIQUE INDEX IF NOT EXISTS inventory_movements_sheet_received_idx
  ON inventory_movements (item_id, movement_date) WHERE kind = 'received';
CREATE UNIQUE INDEX IF NOT EXISTS inventory_movements_sheet_consumed_idx
  ON inventory_movements (item_id, movement_date) WHERE kind = 'consumed';

ALTER TABLE inventory_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_counts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements   ENABLE ROW LEVEL SECURITY;

-- No policies on purpose. Stock figures are not public and no customer-facing
-- page reads them; the admin panel reaches them through the service role,
-- behind the same session and area check as the rest of /admin.
