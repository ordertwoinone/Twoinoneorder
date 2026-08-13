-- Splash screen artwork and the two feature switches that admin asked for.
--
-- Safe to re-run. Every column keeps the behaviour the site already has, so a
-- database that has not run this yet renders exactly as before:
--
--   splash_image_url      blank  → the artwork shipped in /public/splash
--   splash_enabled        true   → the opening screen still shows
--   student_card_enabled  true   → the Student Privilege Card is still offered
--
-- The site works whether or not this has been run: everything that reads these
-- columns asks for them and steps down to the older set if they are missing
-- (PostgREST rejects the whole select if one column is unknown).

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS splash_image_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS splash_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS student_card_enabled boolean NOT NULL DEFAULT true;
