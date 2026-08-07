-- Lets the header logo be switched off from admin → Header without clearing the
-- uploaded image, so it can be turned back on later without re-uploading.
--
-- Safe to re-run. Existing sites default to showing the logo, which is what
-- they do today.
--
-- The site works whether or not this has been run: Navbar asks for the column
-- and falls back to "logo shown" if it is not there yet.

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS header_logo_enabled boolean NOT NULL DEFAULT true;
