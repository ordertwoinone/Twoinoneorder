-- Run this in your Supabase SQL editor to store the Shipday delivery feed.
--
-- One row per Shipday delivery, written by /webhooks/shipday as each event
-- lands. Shipday sends the *whole* delivery on every event — driver, times,
-- costs and all — so each delivery keeps a single row that is overwritten in
-- place rather than an event log: admin → Shipday Delivery wants "where is
-- this order now", not "everything that ever happened to it". The untouched
-- payload is kept in `raw` so nothing is lost by that choice.

CREATE TABLE IF NOT EXISTS shipday_deliveries (
  -- Shipday's own order id, so a repeated delivery updates rather than duplicates.
  id                     text        PRIMARY KEY,
  -- Shipday echoes back the order number it was created with, which is how a
  -- delivery is matched to the take.app order it came from.
  order_number           text        NOT NULL DEFAULT '',
  -- Which system pushed the order into Shipday, e.g. TOAST / take.app.
  provider               text        NOT NULL DEFAULT '',
  order_source           text        NOT NULL DEFAULT '',

  -- The event that last touched this row, e.g. ORDER_ASSIGNED / ORDER_COMPLETED.
  last_event             text        NOT NULL DEFAULT '',
  -- Shipday's own status for the delivery, e.g. NOT_ASSIGNED / PICKED_UP.
  order_status           text        NOT NULL DEFAULT 'NOT_ASSIGNED',
  auto_assignment_status text        NOT NULL DEFAULT '',
  -- When Shipday says the event happened. Used to drop a late delivery that
  -- would otherwise walk the status backwards.
  event_at               timestamptz,

  -- The assigned driver, flattened out of `carrier` so the board can sort and
  -- filter on it. Null until somebody is assigned.
  carrier_id             bigint,
  carrier_name           text        NOT NULL DEFAULT '',
  carrier_phone          text        NOT NULL DEFAULT '',
  carrier_email          text        NOT NULL DEFAULT '',
  carrier_status         text        NOT NULL DEFAULT '',
  carrier_plate_number   text        NOT NULL DEFAULT '',
  carrier_vehicle        text        NOT NULL DEFAULT '',

  -- Money, as Shipday sends it: a major-unit decimal, not the smallest unit
  -- take.app uses. Kept numeric so it is never rounded through a float.
  total_cost             numeric(12,2) NOT NULL DEFAULT 0,
  delivery_fee           numeric(12,2) NOT NULL DEFAULT 0,
  tip                    numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount        numeric(12,2) NOT NULL DEFAULT 0,
  tax                    numeric(12,2) NOT NULL DEFAULT 0,
  payment_method         text        NOT NULL DEFAULT '',

  -- Where it is going and where it came from, kept whole: Shipday nests name,
  -- address, phone and lat/lng in here and the shape varies by integration.
  delivery_details       jsonb       NOT NULL DEFAULT '{}',
  pickup_details         jsonb       NOT NULL DEFAULT '{}',
  delivery_note          text        NOT NULL DEFAULT '',

  -- Metres and seconds, as Shipday sends them.
  driving_distance       integer     NOT NULL DEFAULT 0,
  driving_duration       integer     NOT NULL DEFAULT 0,
  eta                    text        NOT NULL DEFAULT '',

  -- The delivery's milestones. Each stays null until that step happens, which
  -- is what the timeline on the admin screen reads.
  placement_time         timestamptz,
  expected_pickup_time   timestamptz,
  expected_delivery_time timestamptz,
  assigned_time          timestamptz,
  start_time             timestamptz,
  pickedup_time          timestamptz,
  arrived_time           timestamptz,
  delivery_time          timestamptz,

  -- Proof-of-delivery photos and signatures.
  pod_urls               jsonb       NOT NULL DEFAULT '[]',

  -- The untouched payload, so a field we do not map yet is never lost.
  raw                    jsonb       NOT NULL DEFAULT '{}',
  received_at            timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- The board lists newest first, and matching a delivery to its take.app order
-- is a lookup by order number.
CREATE INDEX IF NOT EXISTS shipday_deliveries_placed_idx ON shipday_deliveries (placement_time DESC);
CREATE INDEX IF NOT EXISTS shipday_deliveries_number_idx ON shipday_deliveries (order_number);
CREATE INDEX IF NOT EXISTS shipday_deliveries_status_idx ON shipday_deliveries (order_status);

-- No policies, for the same reason as takeapp_orders: these rows carry customer
-- addresses, phone numbers and a driver's contact details, and both the webhook
-- and the admin stream use the service role. RLS on with zero policies denies
-- every anon and signed-in client.
ALTER TABLE shipday_deliveries ENABLE ROW LEVEL SECURITY;

-- The admin screen's live connection is a server-side subscription to this
-- table, so it has to be part of the realtime publication.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE shipday_deliveries;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Realtime sends the whole row on an update only when the table replicates it.
ALTER TABLE shipday_deliveries REPLICA IDENTITY FULL;
