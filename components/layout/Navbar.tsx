import { supabaseAdmin } from "@/lib/supabase-admin";
import NavbarClient, { NavbarContent } from "./NavbarClient";

const FALLBACK: NavbarContent = {
  title: "TWOINONE",
  titleAr: null,
  titleHighlight: "ORDER",
  titleHighlightAr: null,
  tagline: "Good Food, One Click Away",
  taglineAr: null,
  logoUrl: "/logos/two-in-one.png",
  logoEnabled: true,
};

const BASE_COLUMNS = "header_title, header_title_highlight, header_tagline, header_logo_url";
/* Added by supabase/arabic_translations.sql. */
const ARABIC_COLUMNS = "header_title_ar, header_title_highlight_ar, header_tagline_ar";
/* Added by supabase/header_logo_toggle.sql. */
const TOGGLE_COLUMN = "header_logo_enabled";

type Row = Record<string, string | boolean | null>;

/**
 * Wordmark, tagline, logo and the logo's on/off switch come from admin →
 * Header. PostgREST rejects the whole select if one column is unknown, so ask
 * for everything and step down a tier at a time — a database that has not run
 * the newer migrations still renders a complete header rather than none.
 */
async function getContent(): Promise<NavbarContent> {
  const attempts = [
    `${BASE_COLUMNS}, ${ARABIC_COLUMNS}, ${TOGGLE_COLUMN}`,
    `${BASE_COLUMNS}, ${ARABIC_COLUMNS}`,
    BASE_COLUMNS,
  ];

  let data: Row | null = null;
  for (const columns of attempts) {
    const res = await supabaseAdmin.from("site_settings").select(columns).single();
    if (!res.error) {
      data = res.data as unknown as Row;
      break;
    }
  }

  if (!data) return FALLBACK;

  const text = (key: string) => {
    const value = data?.[key];
    return typeof value === "string" ? value.trim() : "";
  };
  const optional = (key: string) => text(key) || null;

  return {
    title: text("header_title") || FALLBACK.title,
    titleAr: optional("header_title_ar"),
    // Only the highlight and tagline may be deliberately emptied.
    titleHighlight: data.header_title_highlight === undefined
      ? FALLBACK.titleHighlight
      : text("header_title_highlight"),
    titleHighlightAr: optional("header_title_highlight_ar"),
    tagline: data.header_tagline === undefined ? FALLBACK.tagline : text("header_tagline"),
    taglineAr: optional("header_tagline_ar"),
    logoUrl: text("header_logo_url") || FALLBACK.logoUrl,
    // Missing column (migration not run) means "show it", as it always has.
    logoEnabled: data.header_logo_enabled !== false,
  };
}

export default async function Navbar({ className = "" }: { className?: string }) {
  const content = await getContent();
  return <NavbarClient className={className} content={content} />;
}
