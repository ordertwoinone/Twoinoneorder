-- Run this in your Supabase SQL editor to lock the admin panel down.
--
-- Before this table existed, anyone with a Supabase session could open /admin —
-- including customers who signed in with Google, since they share the same auth
-- users table. Membership here is now what grants entry, and `areas` is what
-- each member may open once inside.

CREATE TABLE IF NOT EXISTS admin_users (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  -- The Supabase account this member signs in with.
  user_id    uuid        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text        UNIQUE NOT NULL,
  name       text        NOT NULL DEFAULT '',
  -- Area keys from lib/admin-areas.ts, e.g. {bookings,live-orders}.
  areas      text[]      NOT NULL DEFAULT '{}',
  -- The owner holds every area and is the only one who can manage the team.
  is_owner   boolean     NOT NULL DEFAULT false,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_users_user_id_idx ON admin_users (user_id);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- A signed-in user may read their own membership and nothing else: that single
-- row is what middleware checks on every admin request, and it has to be
-- readable with the visitor's own session. Every write goes through the service
-- role in /api/admin/team.
DROP POLICY IF EXISTS "Read own admin membership" ON admin_users;
CREATE POLICY "Read own admin membership" ON admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- ─── Seed the owner ───────────────────────────────────────────────────────────
-- Matched by email against the existing account, so no id is hard-coded.

INSERT INTO admin_users (user_id, email, name, areas, is_owner, is_active)
SELECT u.id, u.email, 'Owner', '{}', true, true
FROM auth.users u
WHERE u.email = 'ordertwoinone@gmail.com'
ON CONFLICT (email) DO UPDATE
  SET is_owner = true, is_active = true, user_id = EXCLUDED.user_id;
