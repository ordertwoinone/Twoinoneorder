-- Website orders on the till's board and the kitchen's.
--
-- They were missing for a structural reason rather than a bug: counter and
-- kiosk orders are rows in `bookings`, while everything ordered on the website
-- arrives from take.app and lands in `takeapp_orders`. The board only ever read
-- the first table, so a website order sat unmade until the customer rang — the
-- exact failure the one-board design was meant to prevent.
--
-- The board now reads both. What it needed was somewhere to record the
-- kitchen's own progress, because take.app owns `order_status` on those rows:
-- the webhook rewrites it on every event, so a cook marking a ticket
-- "preparing" would have it silently reset by the next delivery from take.app.
--
-- Hence a column the storefront never writes. take.app keeps its status; the
-- branch keeps the one it works to, and neither overwrites the other.
--
-- Safe to re-run.

ALTER TABLE takeapp_orders
  -- '' = not started; otherwise pending | confirmed | completed | cancelled,
  -- the same vocabulary the board uses for a booking.
  ADD COLUMN IF NOT EXISTS kitchen_status  text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS kitchen_moved_at timestamptz,
  -- Who moved it, so a ticket marked done by nobody is a question that can be
  -- asked of somebody.
  ADD COLUMN IF NOT EXISTS kitchen_moved_by uuid REFERENCES pos_staff(id) ON DELETE SET NULL;

COMMENT ON COLUMN takeapp_orders.kitchen_status IS
  'The branch''s own progress on a website order. take.app owns order_status; this column is ours.';

-- The board asks for "today's website orders, newest first" every fifteen
-- seconds on every tablet, and that is the index for it.
CREATE INDEX IF NOT EXISTS takeapp_orders_board_idx
  ON takeapp_orders (order_created_at DESC, kitchen_status);
