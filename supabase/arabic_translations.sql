-- ─────────────────────────────────────────────────────────────────────────────
-- Arabic content columns
--
-- Run this once in the Supabase SQL editor. It is safe to re-run: every
-- statement is IF NOT EXISTS and nothing is dropped, renamed or backfilled.
--
-- Every admin-editable piece of text gets an `_ar` twin. The English column
-- stays exactly as it is and remains the fallback — leaving an Arabic field
-- blank in the admin panel simply shows the English wording, so the site never
-- renders an empty heading while translations are still being filled in.
--
-- Columns deliberately left alone: ids, slugs, colours, image URLs, links,
-- emoji, coupon codes, phone/WhatsApp numbers, ratings and any number, boolean
-- or timestamp. None of those change with the language.
--
-- The four JSON columns (buffet_about.hours / .cuisines, kalba_banner.chips,
-- kalba_study.features) need no migration: they are jsonb, so the Arabic text
-- is stored as extra keys inside each element (line1_ar, label_ar, …) and the
-- admin panel writes them there.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Site-wide: header, footer, contact page ──────────────────────────────────
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS site_name_ar                 text,
  ADD COLUMN IF NOT EXISTS tagline_ar                   text,
  ADD COLUMN IF NOT EXISTS address_ar                   text,
  ADD COLUMN IF NOT EXISTS city_ar                      text,
  ADD COLUMN IF NOT EXISTS country_ar                   text,
  ADD COLUMN IF NOT EXISTS header_title_ar              text,
  ADD COLUMN IF NOT EXISTS header_title_highlight_ar    text,
  ADD COLUMN IF NOT EXISTS header_tagline_ar            text,
  ADD COLUMN IF NOT EXISTS contact_heading_ar           text,
  ADD COLUMN IF NOT EXISTS contact_heading_highlight_ar text,
  ADD COLUMN IF NOT EXISTS contact_subheading_ar        text,
  ADD COLUMN IF NOT EXISTS contact_hours_ar             text,
  ADD COLUMN IF NOT EXISTS contact_restaurant_name_ar   text,
  ADD COLUMN IF NOT EXISTS contact_reviews_ar           text,
  ADD COLUMN IF NOT EXISTS contact_location_label_ar    text;

-- ── Homepage ─────────────────────────────────────────────────────────────────
ALTER TABLE hero_banners
  ADD COLUMN IF NOT EXISTS tag_ar             text,
  ADD COLUMN IF NOT EXISTS headline_orange_ar text,
  ADD COLUMN IF NOT EXISTS headline_black_ar  text,
  ADD COLUMN IF NOT EXISTS subtitle_ar        text,
  ADD COLUMN IF NOT EXISTS cta_text_ar        text,
  ADD COLUMN IF NOT EXISTS food_alt_ar        text;

ALTER TABLE home_categories
  ADD COLUMN IF NOT EXISTS name_ar text;

ALTER TABLE homepage_cards
  ADD COLUMN IF NOT EXISTS title_ar       text,
  ADD COLUMN IF NOT EXISTS subtitle_ar    text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS badge_ar       text,
  ADD COLUMN IF NOT EXISTS button_text_ar text;

-- `cuisine` is a text[] on this table, so its twin matches the type.
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS name_ar          text,
  ADD COLUMN IF NOT EXISTS cuisine_ar       text[],
  ADD COLUMN IF NOT EXISTS delivery_time_ar text,
  ADD COLUMN IF NOT EXISTS badge_ar         text,
  ADD COLUMN IF NOT EXISTS offer_text_ar    text;

ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS badge_text_ar text,
  ADD COLUMN IF NOT EXISTS title_ar      text,
  ADD COLUMN IF NOT EXISTS subtitle_ar   text,
  ADD COLUMN IF NOT EXISTS cta_text_ar   text;

ALTER TABLE trust_badges
  ADD COLUMN IF NOT EXISTS title_ar    text,
  ADD COLUMN IF NOT EXISTS subtitle_ar text,
  ADD COLUMN IF NOT EXISTS detail_ar   text;

ALTER TABLE campus_promo
  ADD COLUMN IF NOT EXISTS title_ar       text,
  ADD COLUMN IF NOT EXISTS subtitle_ar    text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS badge_ar       text,
  ADD COLUMN IF NOT EXISTS button_text_ar text,
  ADD COLUMN IF NOT EXISTS perk1_ar       text,
  ADD COLUMN IF NOT EXISTS perk2_ar       text,
  ADD COLUMN IF NOT EXISTS perk3_ar       text;

-- ── Buffet ───────────────────────────────────────────────────────────────────
ALTER TABLE buffet_hero
  ADD COLUMN IF NOT EXISTS restaurant_name_ar text,
  ADD COLUMN IF NOT EXISTS cuisine_ar         text,
  ADD COLUMN IF NOT EXISTS rating_count_ar    text,
  ADD COLUMN IF NOT EXISTS delivery_time_ar   text,
  ADD COLUMN IF NOT EXISTS delivery_fee_ar    text,
  ADD COLUMN IF NOT EXISTS closes_at_ar       text;

ALTER TABLE buffet_banners
  ADD COLUMN IF NOT EXISTS title_ar           text,
  ADD COLUMN IF NOT EXISTS title_highlight_ar text,
  ADD COLUMN IF NOT EXISTS subtitle_ar        text,
  ADD COLUMN IF NOT EXISTS price_label_ar     text,
  ADD COLUMN IF NOT EXISTS cta_text_ar        text;

ALTER TABLE buffet_why_choose_us
  ADD COLUMN IF NOT EXISTS label_ar     text,
  ADD COLUMN IF NOT EXISTS sub_label_ar text;

ALTER TABLE buffet_timings
  ADD COLUMN IF NOT EXISTS label_ar       text,
  ADD COLUMN IF NOT EXISTS time_range_ar  text,
  ADD COLUMN IF NOT EXISTS price_label_ar text;

ALTER TABLE buffet_popular_dishes
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS tag_ar  text;

ALTER TABLE buffet_menu_sections
  ADD COLUMN IF NOT EXISTS title_ar       text,
  ADD COLUMN IF NOT EXISTS count_label_ar text;

ALTER TABLE buffet_menu_items
  ADD COLUMN IF NOT EXISTS name_ar text;

-- `hours` stays as it is: its Arabic lives inside each row (label_ar, time_ar).
-- `cuisines` is a flat list of strings with nowhere to put a twin, so it gets a
-- parallel list; the admin editor adds and removes from both together.
ALTER TABLE buffet_about
  ADD COLUMN IF NOT EXISTS about_title_ar text,
  ADD COLUMN IF NOT EXISTS about_text_ar  text,
  ADD COLUMN IF NOT EXISTS location_ar    text,
  ADD COLUMN IF NOT EXISTS cuisines_ar    jsonb DEFAULT '[]'::jsonb;

ALTER TABLE buffet_reviews
  ADD COLUMN IF NOT EXISTS name_ar      text,
  ADD COLUMN IF NOT EXISTS text_ar      text,
  ADD COLUMN IF NOT EXISTS date_text_ar text;

ALTER TABLE buffet_review_summary
  ADD COLUMN IF NOT EXISTS rating_count_ar text,
  ADD COLUMN IF NOT EXISTS tab_count_ar    text;

ALTER TABLE buffet_highlights
  ADD COLUMN IF NOT EXISTS name_ar    text,
  ADD COLUMN IF NOT EXISTS cuisine_ar text,
  ADD COLUMN IF NOT EXISTS badge_ar   text;

-- ── University Kalba ─────────────────────────────────────────────────────────
ALTER TABLE kalba_hero
  ADD COLUMN IF NOT EXISTS name_ar             text,
  ADD COLUMN IF NOT EXISTS location_ar         text,
  ADD COLUMN IF NOT EXISTS rating_count_ar     text,
  ADD COLUMN IF NOT EXISTS delivery_time_ar    text,
  ADD COLUMN IF NOT EXISTS delivery_fee_ar     text,
  ADD COLUMN IF NOT EXISTS closes_at_ar        text,
  ADD COLUMN IF NOT EXISTS student_title_ar    text,
  ADD COLUMN IF NOT EXISTS student_subtitle_ar text,
  ADD COLUMN IF NOT EXISTS student_button_ar   text;

-- chips stays jsonb; its Arabic text lives inside each element.
ALTER TABLE kalba_banner
  ADD COLUMN IF NOT EXISTS title_ar           text,
  ADD COLUMN IF NOT EXISTS title_highlight_ar text,
  ADD COLUMN IF NOT EXISTS subtitle_ar        text;

ALTER TABLE kalba_categories
  ADD COLUMN IF NOT EXISTS label_ar text;

ALTER TABLE kalba_popular_items
  ADD COLUMN IF NOT EXISTS name_ar      text,
  ADD COLUMN IF NOT EXISTS time_text_ar text;

-- features stays jsonb; its Arabic text lives inside each element.
ALTER TABLE kalba_study
  ADD COLUMN IF NOT EXISTS title_ar       text,
  ADD COLUMN IF NOT EXISTS subtitle_ar    text,
  ADD COLUMN IF NOT EXISTS button_text_ar text;

ALTER TABLE kalba_daily_deals
  ADD COLUMN IF NOT EXISTS day_ar         text,
  ADD COLUMN IF NOT EXISTS title_ar       text,
  ADD COLUMN IF NOT EXISTS description_ar text;

ALTER TABLE kalba_specials
  ADD COLUMN IF NOT EXISTS name_ar        text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS price_text_ar  text;

ALTER TABLE kalba_coupons
  ADD COLUMN IF NOT EXISTS description_ar text;

-- ── Contact + spin wheel + imported menus ────────────────────────────────────
ALTER TABLE contact_locations
  ADD COLUMN IF NOT EXISTS name_ar    text,
  ADD COLUMN IF NOT EXISTS address_ar text;

ALTER TABLE spin_wheel_settings
  ADD COLUMN IF NOT EXISTS title_ar        text,
  ADD COLUMN IF NOT EXISTS subtitle_ar     text,
  ADD COLUMN IF NOT EXISTS button_label_ar text,
  ADD COLUMN IF NOT EXISTS spin_label_ar   text,
  ADD COLUMN IF NOT EXISTS win_message_ar  text,
  ADD COLUMN IF NOT EXISTS lose_message_ar text;

ALTER TABLE spin_wheel_segments
  ADD COLUMN IF NOT EXISTS label_ar text;

-- Menus imported from the restaurants' own storefronts. The sync overwrites the
-- English columns, so these two are the only place a manual Arabic name
-- survives a re-import.
ALTER TABLE restaurant_menu_items
  ADD COLUMN IF NOT EXISTS name_ar     text,
  ADD COLUMN IF NOT EXISTS category_ar text;
