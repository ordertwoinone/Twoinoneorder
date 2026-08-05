import { supabaseAdmin } from "@/lib/supabase-admin";
import NavbarClient, { NavbarContent } from "./NavbarClient";

const FALLBACK: NavbarContent = {
  title: "TWOINONE",
  titleHighlight: "ORDER",
  tagline: "Good Food, One Click Away",
  logoUrl: "/logos/two-in-one.png",
};

/* Wordmark, tagline and logo come from admin → Header. A missing row or a
   blank field falls back, so the header never renders empty. */
async function getContent(): Promise<NavbarContent> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("header_title, header_title_highlight, header_tagline, header_logo_url")
    .single();

  if (!data) return FALLBACK;

  return {
    title: data.header_title?.trim() || FALLBACK.title,
    // Only the highlight and tagline may be deliberately emptied.
    titleHighlight: data.header_title_highlight?.trim() ?? FALLBACK.titleHighlight,
    tagline: data.header_tagline?.trim() ?? FALLBACK.tagline,
    logoUrl: data.header_logo_url?.trim() || FALLBACK.logoUrl,
  };
}

export default async function Navbar({ className = "" }: { className?: string }) {
  const content = await getContent();
  return <NavbarClient className={className} content={content} />;
}
