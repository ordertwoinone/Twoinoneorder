-- Run this in your Supabase SQL editor to store the take.app order feed.
--
-- Orders arrive two ways and land in the same table: the webhook at
-- /webhooks/takeapp writes each event as it happens, and admin → Live Orders
-- reads the merchant API once on open. Keeping them here means an order that
-- arrived while nobody had the screen open is still there afterwards, and it
-- is what the admin screen's live connection listens to.

CREATE TABLE IF NOT EXISTS takeapp_orders (
  -- take.app's own order id, so a repeated delivery updates rather than duplicates.
  id                  text        PRIMARY KEY,
  number              text        NOT NULL DEFAULT '',
  name                text        NOT NULL DEFAULT '',
  store_name          text        NOT NULL DEFAULT '',
  store_alias         text        NOT NULL DEFAULT '',
  order_status        text        NOT NULL DEFAULT 'pending',
  payment_status      text        NOT NULL DEFAULT 'pending',
  fulfillment_status  text        NOT NULL DEFAULT 'unfulfilled',
  customer_name       text        NOT NULL DEFAULT '',
  customer_phone      text        NOT NULL DEFAULT '',
  line_items          jsonb       NOT NULL DEFAULT '[]',
  -- Smallest currency unit, as take.app sends it.
  total_amount        integer     NOT NULL DEFAULT 0,
  currency            text        NOT NULL DEFAULT 'AED',
  remark              text,
  schedule            text,
  -- When take.app created the order, not when we heard about it.
  order_created_at    timestamptz,
  -- The event that last touched this row, e.g. order.created / order.updated.
  last_event          text        NOT NULL DEFAULT '',
  -- The untouched payload, so a field we do not map yet is never lost.
  raw                 jsonb       NOT NULL DEFAULT '{}',
  received_at         timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS takeapp_orders_created_idx ON takeapp_orders (order_created_at DESC);
CREATE INDEX IF NOT EXISTS takeapp_orders_store_idx   ON takeapp_orders (store_name);

-- No policies: the webhook and the admin stream both use the service role, and
-- these rows carry customer names and phone numbers, so nothing else may read
-- them. RLS on with zero policies denies every anon and signed-in client.
ALTER TABLE takeapp_orders ENABLE ROW LEVEL SECURITY;

-- The admin screen's live connection is a server-side subscription to this
-- table, so it has to be part of the realtime publication.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE takeapp_orders;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Realtime sends the whole row on an update only when the table replicates it.
ALTER TABLE takeapp_orders REPLICA IDENTITY FULL;
