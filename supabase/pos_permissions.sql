-- Who is allowed to do what at the till.
--
-- A role was enough while there were three of them and one branch. It stopped
-- being enough the moment a shift had eight people on it: the cashier who is
-- trusted with the drawer count is not the cashier hired last week, and making
-- either of them a "manager" to grant one screen hands them the day close too.
--
-- So the role stays as the shape of the job, and becomes the *default* set of
-- permissions rather than the rule. Anything explicitly granted on the row wins.
--
-- NULL is deliberately not the same as '{}'. NULL means "whatever this role
-- normally gets", which is what every existing account has to keep meaning
-- after this migration runs; '{}' means "nothing at all", which is a decision
-- somebody made on purpose. An empty-array default would have silently locked
-- every till in the building out on deploy.
--
-- Safe to re-run.

ALTER TABLE pos_staff
  ADD COLUMN IF NOT EXISTS permissions text[];

COMMENT ON COLUMN pos_staff.permissions IS
  'Explicit permission keys (see lib/pos/permissions.ts). NULL = the role''s defaults.';
