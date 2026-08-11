-- Run this in your Supabase SQL editor to hand out Student Privilege Cards.
--
-- One card per account: the UNIQUE on user_id is what makes "already a member"
-- a fact the database enforces, rather than something the sign-up screen has to
-- remember. Deleting the account takes the card with it, so a reused e-mail
-- never inherits someone else's number.
--
-- card_number and member_id are minted by /api/student-card, never by the
-- browser. They are UNIQUE here so two students issued at the same instant end
-- up with one retry rather than one shared card.

CREATE TABLE IF NOT EXISTS student_cards (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- As it should read on the card, which is not always the account's name.
  full_name        text        NOT NULL,
  university       text        NOT NULL,
  -- The academic year the card was issued for, e.g. "2026 – 2027".
  academic_year    text        NOT NULL,
  date_of_birth    date        NOT NULL,
  -- Human-sized handle for the counter: "KU-25896".
  member_id        text        NOT NULL UNIQUE,
  -- Sixteen digits, stored unformatted and grouped only for display.
  card_number      text        NOT NULL UNIQUE,
  discount_percent int         NOT NULL DEFAULT 10,
  valid_thru       date        NOT NULL,
  -- 'active' or 'revoked'. Only an active, unexpired card discounts an order.
  status           text        NOT NULL DEFAULT 'active',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS student_cards_member_idx ON student_cards (member_id);

ALTER TABLE student_cards ENABLE ROW LEVEL SECURITY;

-- A student may read their own card. Nothing may write one from the browser:
-- issuing goes through the API route, which holds the service-role key and is
-- the only place a card number is minted.
DROP POLICY IF EXISTS "student reads own card" ON student_cards;
CREATE POLICY "student reads own card" ON student_cards
  FOR SELECT USING (auth.uid() = user_id);
