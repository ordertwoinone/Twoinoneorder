-- Header wordmark, tagline and logo (stored on the single site_settings row)
-- so the top bar reads from admin → Header instead of being hard-coded.
-- header_title is the dark half of the wordmark, header_title_highlight the
-- orange half; header_logo_url falls back to /logos/two-in-one.png when blank.
alter table site_settings
  add column if not exists header_title text default 'TWOINONE',
  add column if not exists header_title_highlight text default 'ORDER',
  add column if not exists header_tagline text default 'Good Food, One Click Away',
  add column if not exists header_logo_url text default '';
