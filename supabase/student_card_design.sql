-- The look of the Student Privilege Card: every word and every colour on it.
--
-- One row, edited in admin → Student Card. Wording defaults to blank, which
-- means "print the words that ship with the site" — so a fresh row reproduces
-- the card exactly as it is drawn today, translations included, until somebody
-- deliberately types over a field.
--
-- Safe to re-run. The site works whether or not it has been run: the reader
-- treats a missing table as "no design saved" and falls back to the defaults.

CREATE TABLE IF NOT EXISTS student_card_design (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Wording. Blank = the built-in text.
  brand_line1         text        NOT NULL DEFAULT '',
  brand_line2         text        NOT NULL DEFAULT '',
  brand_accent        text        NOT NULL DEFAULT '',
  cafe_line           text        NOT NULL DEFAULT '',
  tagline             text        NOT NULL DEFAULT '',
  title_line1         text        NOT NULL DEFAULT '',
  title_line2         text        NOT NULL DEFAULT '',
  issuer              text        NOT NULL DEFAULT '',
  member_id_label     text        NOT NULL DEFAULT '',
  valid_thru_label    text        NOT NULL DEFAULT '',
  discount_line1      text        NOT NULL DEFAULT '',
  discount_line2      text        NOT NULL DEFAULT '',
  -- {year} is replaced with the student's academic year.
  academic_year_label text        NOT NULL DEFAULT '',

  -- Colours, as the card was drawn.
  accent_color        text        NOT NULL DEFAULT '#e8521a',
  text_color          text        NOT NULL DEFAULT '#1a1a1a',
  muted_color         text        NOT NULL DEFAULT '#4b5563',
  tagline_color       text        NOT NULL DEFAULT '#6b7280',
  number_color        text        NOT NULL DEFAULT '#1a1a1a',
  bg_from             text        NOT NULL DEFAULT '#fbfaf9',
  bg_via              text        NOT NULL DEFAULT '#f4f1ee',
  bg_to               text        NOT NULL DEFAULT '#efeae5',
  tab_bg_color        text        NOT NULL DEFAULT '#e8521a',
  tab_text_color      text        NOT NULL DEFAULT '#ffffff',

  -- The printed decoration.
  show_engraving      boolean     NOT NULL DEFAULT true,
  show_waves          boolean     NOT NULL DEFAULT true,

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Read server-side via the service role key, which bypasses RLS.
ALTER TABLE student_card_design ENABLE ROW LEVEL SECURITY;

-- Exactly one row, and only if there isn't one already.
INSERT INTO student_card_design (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM student_card_design);
