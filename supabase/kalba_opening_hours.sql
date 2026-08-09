-- Run this in your Supabase SQL editor to give the branch a weekly schedule.
--
-- One entry per weekday, 0 = Sunday, times in 24-hour local time:
--   [{"day":0,"closed":false,"open":"09:00","close":"23:30"}, …]
--
-- The pickup time picker only offers slots inside the day's window, and none
-- at all on a day marked closed. An empty array falls back to the single
-- closes_at field, so a branch that has not filled the schedule in still
-- behaves as it did before.
--
-- The existing is_open flag stays the sudden-close switch: turn it off and
-- pickup stops being offered whatever the schedule says.

ALTER TABLE kalba_hero
  ADD COLUMN IF NOT EXISTS opening_hours jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN kalba_hero.opening_hours IS
  'One entry per weekday: [{"day":0,"closed":false,"open":"09:00","close":"23:30"}] with day 0 = Sunday and times in 24-hour local time. Empty falls back to closes_at.';

UPDATE kalba_hero
SET opening_hours = '[
  {"day":0,"closed":false,"open":"09:00","close":"23:30"},
  {"day":1,"closed":false,"open":"09:00","close":"23:30"},
  {"day":2,"closed":false,"open":"09:00","close":"23:30"},
  {"day":3,"closed":false,"open":"09:00","close":"23:30"},
  {"day":4,"closed":false,"open":"09:00","close":"23:30"},
  {"day":5,"closed":false,"open":"09:00","close":"23:30"},
  {"day":6,"closed":false,"open":"09:00","close":"23:30"}
]'::jsonb
WHERE opening_hours = '[]'::jsonb;
