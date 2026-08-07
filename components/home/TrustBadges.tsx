import { supabaseAdmin } from "@/lib/supabase-admin";
import TrustBadgesClient, { Badge } from "./TrustBadgesClient";

const BASE_COLUMNS = "emoji, title, subtitle, detail, is_call";
/* Added by supabase/arabic_translations.sql. */
const ARABIC_COLUMNS = "title_ar, subtitle_ar, detail_ar";

function query(columns: string) {
  return supabaseAdmin
    .from("trust_badges")
    .select(columns)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
}

/**
 * PostgREST rejects the whole select if one column is unknown, so asking for
 * the Arabic twins before the migration has run would drop the entire strip
 * off the homepage. Ask for them, and fall back to the English columns alone.
 */
async function getBadges(): Promise<Badge[]> {
  const full = await query(`${BASE_COLUMNS}, ${ARABIC_COLUMNS}`);
  if (!full.error) return (full.data as unknown as Badge[]) ?? [];

  const base = await query(BASE_COLUMNS);
  return (base.data as unknown as Badge[]) ?? [];
}

async function getData(): Promise<{ phone: string; badges: Badge[] }> {
  const [{ data: settings }, badges] = await Promise.all([
    supabaseAdmin.from("site_settings").select("phone").single(),
    getBadges(),
  ]);

  return {
    phone: settings?.phone || "+971522305216",
    badges,
  };
}

export default async function TrustBadges() {
  const { phone, badges } = await getData();
  if (!badges.length) return null;
  return <TrustBadgesClient phone={phone} badges={badges} />;
}
