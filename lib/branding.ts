import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * One source of truth for the brand mark.
 *
 * The logo used to be hard-coded in the footer, the splash screen, the account
 * page and the 404, so uploading a new one in the admin panel only ever changed
 * the header. Everything that shows the logo now reads it from here instead.
 *
 * Two admin fields can set it, and either works:
 *   admin → Header   → header_logo_url   (takes precedence)
 *   admin → Settings → logo_url          (general brand logo)
 * With both blank it falls back to the file shipped in /public.
 */

export const FALLBACK_LOGO = "/logos/two-in-one.png";
export const FALLBACK_SITE_NAME = "Two In One";

export interface Branding {
  logoUrl: string;
  siteName: string;
}

export async function getBranding(): Promise<Branding> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("header_logo_url, logo_url, site_name")
    .single();

  return {
    logoUrl: data?.header_logo_url?.trim() || data?.logo_url?.trim() || FALLBACK_LOGO,
    siteName: data?.site_name?.trim() || FALLBACK_SITE_NAME,
  };
}
