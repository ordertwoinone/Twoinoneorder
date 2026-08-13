/**
 * How the Student Privilege Card looks — every word and every colour on it.
 *
 * Edited in admin → Student Card. Kept apart from the card data itself: a row
 * in student_cards is one student's number and name, while this is the artwork
 * every one of them is printed on.
 *
 * Wording defaults to blank, which means "use the words that ship with the
 * site" — the card keeps its dictionary strings, and its translations, until
 * somebody deliberately types over them. Colours default to the values the card
 * was drawn with, so an untouched design is the card as it always looked.
 */

export interface StudentCardDesign {
  /* ── Wording. Blank = the built-in text. ───────────────────────────── */
  brand_line1: string;
  brand_line2: string;
  /** The word picked out in the accent colour, e.g. the "one" of "in one". */
  brand_accent: string;
  cafe_line: string;
  tagline: string;
  title_line1: string;
  title_line2: string;
  issuer: string;
  member_id_label: string;
  valid_thru_label: string;
  discount_line1: string;
  discount_line2: string;
  /** `{year}` is replaced with the student's academic year. */
  academic_year_label: string;

  /* ── Colours. ──────────────────────────────────────────────────────── */
  accent_color: string;
  text_color: string;
  muted_color: string;
  tagline_color: string;
  number_color: string;
  bg_from: string;
  bg_via: string;
  bg_to: string;
  tab_bg_color: string;
  tab_text_color: string;

  /* ── The printed decoration. ───────────────────────────────────────── */
  show_engraving: boolean;
  show_waves: boolean;
}

export const DEFAULT_CARD_DESIGN: StudentCardDesign = {
  brand_line1: "",
  brand_line2: "",
  brand_accent: "",
  cafe_line: "",
  tagline: "",
  title_line1: "",
  title_line2: "",
  issuer: "",
  member_id_label: "",
  valid_thru_label: "",
  discount_line1: "",
  discount_line2: "",
  academic_year_label: "",

  accent_color: "#e8521a",
  text_color: "#1a1a1a",
  muted_color: "#4b5563",
  tagline_color: "#6b7280",
  number_color: "#1a1a1a",
  bg_from: "#fbfaf9",
  bg_via: "#f4f1ee",
  bg_to: "#efeae5",
  tab_bg_color: "#e8521a",
  tab_text_color: "#ffffff",

  show_engraving: true,
  show_waves: true,
};

/** The wording the admin panel shows as placeholders — what blank will print. */
export const CARD_TEXT_DEFAULTS: Record<string, string> = {
  brand_line1: "two",
  brand_line2: "in",
  brand_accent: "one",
  cafe_line: "UNIVERSITY CAFE",
  tagline: "Good Food, One Click Away",
  title_line1: "STUDENT",
  title_line2: "PRIVILEGE CARD",
  issuer: "TWO IN ONE UNIVERSITY CAFE",
  member_id_label: "MEMBER ID",
  valid_thru_label: "VALID THRU",
  discount_line1: "DISCOUNT ON",
  discount_line2: "ALL ORDERS",
  academic_year_label: "ACADEMIC YEAR: {year}",
};

type DesignRow = Partial<Record<keyof StudentCardDesign, unknown>> | null | undefined;

/**
 * Fills in whatever the row is missing.
 *
 * A blank colour falls back rather than painting the card with an empty string,
 * which browsers quietly ignore and which would leave one element unstyled and
 * the rest correct — the hardest kind of wrong to spot.
 */
export function normalizeCardDesign(row: DesignRow): StudentCardDesign {
  const out = { ...DEFAULT_CARD_DESIGN };
  if (!row) return out;

  for (const key of Object.keys(DEFAULT_CARD_DESIGN) as (keyof StudentCardDesign)[]) {
    const value = row[key];

    if (typeof DEFAULT_CARD_DESIGN[key] === "boolean") {
      // Only an explicit false switches decoration off.
      if (typeof value === "boolean") (out[key] as boolean) = value;
      continue;
    }

    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    // Wording may legitimately be emptied; a colour may not.
    if (trimmed === "" && key.endsWith("_color")) continue;
    if (trimmed === "" && (key === "bg_from" || key === "bg_via" || key === "bg_to")) continue;
    (out[key] as string) = trimmed;
  }

  return out;
}
