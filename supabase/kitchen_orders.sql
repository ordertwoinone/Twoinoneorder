-- Orders placed from the /kitchens page, shown in admin → Kitchens Page → Orders.
--
-- Also splits the single "kitchens" admin permission into Menu, Waiters and
-- Orders, so anyone who had it keeps all three until admin → Team changes that.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS kitchen_orders (
  id           uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  -- The number staff and the customer see.
  order_number bigserial     NOT NULL,
  -- Made by the customer's page, so a retry after a dropped connection cannot
  -- place the same order twice.
  client_ref   text          NOT NULL UNIQUE,
  table_code   text,
  guests       integer       NOT NULL CHECK (guests >= 1),
  -- Null when no waiter typed a PIN. The name is copied so that deleting a
  -- waiter does not blank their past orders.
  waiter_id    uuid          REFERENCES kitchen_waiters (id) ON DELETE SET NULL,
  waiter_name  text,
  -- A copy of each dish and its add-ons as sold, at the prices charged.
  items        jsonb         NOT NULL,
  total        numeric(10,2) NOT NULL CHECK (total >= 0),
  status       text          NOT NULL DEFAULT 'new'
               CHECK (status IN ('new', 'preparing', 'served', 'cancelled')),
  -- For limiting abuse of the public order form. Only a hash of the address.
  ip_hash      text          NOT NULL DEFAULT '',
  created_at   timestamptz   DEFAULT now(),
  updated_at   timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kitchen_orders_status_idx ON kitchen_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS kitchen_orders_ip_idx     ON kitchen_orders (ip_hash, created_at DESC);

-- No policies: reachable only through the service role, never the public key.
ALTER TABLE kitchen_orders ENABLE ROW LEVEL SECURITY;

-- Replace the old permission with the three new ones.
UPDATE admin_users
SET areas = array_remove(areas, 'kitchens') || ARRAY['kitchens-menu', 'kitchens-waiters', 'kitchens-orders']
WHERE 'kitchens' = ANY (areas);
