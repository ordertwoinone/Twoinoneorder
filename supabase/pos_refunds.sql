-- Giving money back.
--
-- A customer cancels one dish out of three and keeps the other two. Until now
-- the till could only cancel the whole order, so the way this was handled was
-- to cancel it and ring up a new one — which loses the original order number
-- the customer is holding, and puts a sale and a void in the day's figures
-- where there was one order and one refund.
--
-- Two rules make the rest of it fall out:
--
--   An unpaid order is edited, not refunded. Nothing has changed hands, so
--   removing a dish just makes the order smaller and the customer pays less.
--
--   A paid order is never edited. What was charged was charged; removing a
--   dish from it records a refund of that dish's share and leaves the original
--   total standing. That is what makes a receipt printed today and the same
--   receipt reprinted next month agree with each other, and what lets the day
--   close show a sale and a refund rather than a sale that quietly shrank.
--
-- Safe to re-run.

-- ─── What was given back ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pos_refunds (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,

  booking_id   uuid        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  /* The shift whose drawer the money actually came out of — not the shift that
     took the order. A refund given at nine in the evening for a breakfast is
     the evening cashier's drawer being short, and pinning it to the morning
     would leave two people each unable to explain their own count. */
  shift_id     uuid        REFERENCES pos_shifts(id) ON DELETE SET NULL,
  staff_uuid   uuid        REFERENCES pos_staff(id) ON DELETE SET NULL,

  amount       numeric(10,2) NOT NULL DEFAULT 0,
  -- 'cash' | 'card' | 'online'. Only cash moves the drawer.
  method       text        NOT NULL DEFAULT 'cash',

  -- 'item' for one dish off an order, 'order' for the whole thing.
  kind         text        NOT NULL DEFAULT 'item',
  reason       text        NOT NULL DEFAULT '',

  /* What was handed back, as it stood: name, quantity and line total. Copied
     rather than referenced, because the order's own item array goes on being
     edited and a refund has to keep meaning what it meant when it was given. */
  items        jsonb       NOT NULL DEFAULT '[]',

  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pos_refunds_booking_idx ON pos_refunds (booking_id);
-- The day close sums these by shift, on every load of the close screen.
CREATE INDEX IF NOT EXISTS pos_refunds_shift_idx   ON pos_refunds (shift_id, created_at);

ALTER TABLE pos_refunds ENABLE ROW LEVEL SECURITY;

-- ─── What an order has had taken off it ──────────────────────────────────────
-- Summed from pos_refunds and kept here as well, so the board and the receipt
-- can show "AED 28.00 refunded" without a join on every card.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS refunded_total numeric(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN bookings.refunded_total IS
  'Money given back on this order. total_amount stays as charged; this is what came off it.';

-- Items inside `items` may carry `cancelled: true` and `refunded_at`, which is
-- what a struck-through line on a reprinted receipt is drawn from. No migration
-- for that: the column is jsonb and the flag simply appears on the lines that
-- have one.

-- ─── What a shift close froze about the non-sales ────────────────────────────
-- The day close sums the shifts rather than recounting the orders, so anything
-- it has to show has to be frozen on the shift row when that shift signed off.
-- Without these it could report a day's refunds as zero while every shift on it
-- showed its own correctly.

ALTER TABLE pos_shifts
  ADD COLUMN IF NOT EXISTS cancelled_total  numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS staff_food_total numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_total     numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_total    numeric(10,2) NOT NULL DEFAULT 0;

-- ─── A cancellation the kitchen has not agreed to yet ────────────────────────
-- Taking a dish off an order that is already on the pan is not the counter's
-- decision alone. The food may be plated; the customer may be told it is
-- coming. So a cancellation on a ticket the kitchen is still working becomes a
-- request: it shows on the board, and the kitchen accepts or declines it.
--
-- Nothing is refunded until it is accepted. Handing money back for a dish that
-- turns out to have been cooked and served is the one outcome worth designing
-- against — the money is gone and the food is gone with it.

ALTER TABLE bookings
  -- '' | 'requested' | 'declined'. Cleared back to '' once acted on.
  ADD COLUMN IF NOT EXISTS cancel_state  text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cancel_reason text NOT NULL DEFAULT '';

COMMENT ON COLUMN bookings.cancel_state IS
  'A cancellation waiting on the kitchen. Items awaiting it carry cancel_requested in items[].';
