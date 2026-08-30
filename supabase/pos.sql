-- The till: staff who work it, the sessions they are signed into, and the
-- shifts they open and close.
--
-- Separate from admin_users on purpose. An admin account is a person with a
-- Google login and a browser; a till account is a name and a PIN, typed on a
-- shared tablet a dozen times a shift, by someone who must never be able to
-- reach the admin panel. Different lifetime, different threat, different table.
--
-- Like the kiosk, the POS sells the University Kalba menu — kalba_categories
-- and kalba_popular_items — and writes orders into bookings with type = 'pos'.
-- One menu, one ledger, three ways in.
--
-- Safe to re-run.

-- ─── Who works the till ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pos_staff (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- What they type into "User ID". Short, theirs, and unique.
  staff_id        text        NOT NULL UNIQUE,
  name            text        NOT NULL DEFAULT '',

  -- 'cashier' takes orders. 'manager' also voids, approves a large expense and
  -- closes the day. Nothing here reaches the admin panel either way.
  role            text        NOT NULL DEFAULT 'cashier',

  -- scrypt. The PIN itself is never stored and cannot be read back — a lost
  -- PIN is reset from the admin panel, not recovered.
  pin_hash        text        NOT NULL DEFAULT '',
  pin_salt        text        NOT NULL DEFAULT '',

  is_active       boolean     NOT NULL DEFAULT true,

  /* A four-digit PIN is ten thousand guesses, which a script finishes in
     seconds. Wrong tries are counted and the account stops answering for a
     while once there have been too many — that turns the whole keyspace into
     days of work instead of a moment's. */
  failed_attempts integer     NOT NULL DEFAULT 0,
  locked_until    timestamptz,

  last_login_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pos_staff_staff_id_idx ON pos_staff (staff_id);

-- ─── Being signed in ─────────────────────────────────────────────────────────
-- Rows rather than a signed cookie, so a session can be ended from the outside:
-- a tablet left logged in overnight, a member of staff who has left, a device
-- that walked. Only the hash of the token is kept, so a copy of this table is
-- not a set of working sessions.

CREATE TABLE IF NOT EXISTS pos_sessions (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash    text        NOT NULL UNIQUE,
  staff_uuid    uuid        NOT NULL REFERENCES pos_staff(id) ON DELETE CASCADE,
  -- Which tablet, as the login screen reported it. For spotting a stray device.
  device_label  text        NOT NULL DEFAULT '',
  expires_at    timestamptz NOT NULL,
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pos_sessions_token_idx   ON pos_sessions (token_hash);
CREATE INDEX IF NOT EXISTS pos_sessions_expiry_idx  ON pos_sessions (expires_at);

-- ─── A shift ─────────────────────────────────────────────────────────────────
-- Opened with a counted float, closed with a counted drawer. Everything the
-- day-close screen reconciles hangs off this row.

CREATE TABLE IF NOT EXISTS pos_shifts (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_uuid       uuid        NOT NULL REFERENCES pos_staff(id) ON DELETE RESTRICT,

  -- 'open' or 'closed'. One open shift per member of staff at a time.
  status           text        NOT NULL DEFAULT 'open',
  -- "Morning", "Evening" — worked out from the opening time, stored so it does
  -- not change meaning when the rota does.
  shift_label      text        NOT NULL DEFAULT '',

  opened_at        timestamptz NOT NULL DEFAULT now(),
  closed_at        timestamptz,

  /* What was in the drawer at each end, as {"5": 10, "10": 5, ...} — the note
     count itself, not just the total, because a drawer that balances on the
     total and not on the notes is worth knowing about. */
  opening_counts   jsonb         NOT NULL DEFAULT '{}',
  opening_float    numeric(10,2) NOT NULL DEFAULT 0,
  opening_note     text          NOT NULL DEFAULT '',

  closing_counts   jsonb         NOT NULL DEFAULT '{}',
  closing_cash     numeric(10,2) NOT NULL DEFAULT 0,
  -- Float plus cash taken, less refunds and anything paid out of the drawer.
  expected_cash    numeric(10,2) NOT NULL DEFAULT 0,
  -- Counted minus expected. Negative is short.
  difference       numeric(10,2) NOT NULL DEFAULT 0,
  closing_note     text          NOT NULL DEFAULT '',

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- One open shift each: opening a second while the first is running is how two
-- sets of takings end up reconciled against one float.
CREATE UNIQUE INDEX IF NOT EXISTS pos_shifts_one_open_per_staff
  ON pos_shifts (staff_uuid) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS pos_shifts_opened_idx ON pos_shifts (opened_at DESC);

-- Read and written only by the server, which holds the service-role key.
-- RLS on with no policies means nothing reaches them with the public anon key —
-- and these rows are PIN hashes and live session tokens.
ALTER TABLE pos_staff    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_shifts   ENABLE ROW LEVEL SECURITY;

-- ─── What a till order records beyond an ordinary one ────────────────────────
-- Who rang it up and on which shift, so the day-close figures come from the
-- orders themselves rather than from a running total nobody can audit.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pos_staff_uuid uuid REFERENCES pos_staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pos_shift_id   uuid REFERENCES pos_shifts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_pos_shift_idx
  ON bookings (pos_shift_id) WHERE pos_shift_id IS NOT NULL;
