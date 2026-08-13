import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * The splash artwork and the feature switches from admin → Settings.
 *
 * Kept apart from getBranding() because these columns arrive with a hand-run
 * migration (supabase/splash_and_feature_toggles.sql) and PostgREST rejects the
 * whole select if one of them is unknown. Asking here, once, means a database
 * that has not run it yet still renders the site — it just gets the defaults.
 */

export const FALLBACK_SPLASH_IMAGE = "/splash/we-bring-it-fast.png";

export interface SiteFlags {
  /** The picture the opening screen shows. */
  splashImageUrl: string;
  /** Whether the opening screen shows at all. */
  splashEnabled: boolean;
  /** Whether the Student Privilege Card is offered to anyone. */
  studentCardEnabled: boolean;
}

const DEFAULTS: SiteFlags = {
  splashImageUrl: FALLBACK_SPLASH_IMAGE,
  splashEnabled: true,
  studentCardEnabled: true,
};

const COLUMNS = "splash_image_url, splash_enabled, student_card_enabled";

export async function getSiteFlags(): Promise<SiteFlags> {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select(COLUMNS)
    .single();

  // Migration not run, or no settings row yet. Both mean "carry on as before".
  if (error || !data) return DEFAULTS;

  const row = data as unknown as Record<string, string | boolean | null>;
  const image = typeof row.splash_image_url === "string" ? row.splash_image_url.trim() : "";

  return {
    splashImageUrl: image || FALLBACK_SPLASH_IMAGE,
    // Only an explicit false switches either of these off.
    splashEnabled: row.splash_enabled !== false,
    studentCardEnabled: row.student_card_enabled !== false,
  };
}
