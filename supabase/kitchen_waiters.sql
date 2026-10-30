-- Waiters for the /kitchens page, managed in admin → Kitchens Page → Waiters.
-- A waiter types their 4-digit PIN into the page's table popup.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS kitchen_waiters (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL,
  -- scrypt. The PIN itself is never stored and cannot be read back: a forgotten
  -- PIN is replaced from the admin panel.
  pin_hash   text        NOT NULL,
  pin_salt   text        NOT NULL,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- A PIN alone identifies the waiter, so there is no account to count wrong
-- guesses against. They are counted per network address instead, and only a
-- hash of the address is kept.
CREATE TABLE IF NOT EXISTS kitchen_waiter_pin_attempts (
  ip_hash         text        PRIMARY KEY,
  failed_attempts integer     NOT NULL DEFAULT 0,
  locked_until    timestamptz,
  updated_at      timestamptz DEFAULT now()
);

-- No policies: reachable only through the service role, never the public key.
ALTER TABLE kitchen_waiters             ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_waiter_pin_attempts ENABLE ROW LEVEL SECURITY;
