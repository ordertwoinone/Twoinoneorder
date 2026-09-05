-- How long the food actually took.
--
-- The board carried a clock that ran while an order was being cooked and then
-- reset to nothing the moment the kitchen marked it done — so the one number
-- worth keeping, how long that ticket took, existed only while nobody needed
-- it yet. A cashier asked "how long is the kitchen running?" had to stand and
-- watch the ones still open.
--
-- Stamped once, the first time an order reaches 'completed'. Never rewritten:
-- a ticket reopened and finished again keeps the time it was first ready,
-- because that is when the customer could have had it.
--
-- Safe to re-run.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS ready_at timestamptz;

COMMENT ON COLUMN bookings.ready_at IS
  'When the kitchen first marked this order done. ready_at - created_at is the prep time.';

CREATE INDEX IF NOT EXISTS bookings_ready_at_idx
  ON bookings (ready_at) WHERE ready_at IS NOT NULL;
