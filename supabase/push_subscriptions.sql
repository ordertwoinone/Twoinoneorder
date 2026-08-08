-- Run this in your Supabase SQL editor to let admin devices receive order pushes.
--
-- One row per device per admin: a phone, a laptop and an installed home-screen
-- app are three subscriptions even for the same person. The endpoint is the
-- push service's own URL for that device, which is what makes it the key.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  -- The admin this device belongs to. Their membership going away takes their
  -- subscriptions with it, so a removed admin stops being notified.
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text        NOT NULL DEFAULT '',
  endpoint     text        UNIQUE NOT NULL,
  -- The browser's encryption keys for this subscription.
  p256dh       text        NOT NULL,
  auth         text        NOT NULL,
  -- Whose phone it is, in human terms, for the devices list.
  user_agent   text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);

-- Only the service role touches this table: the subscribe route writes it and
-- the webhook reads it. RLS on with no policies denies everything else.
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
