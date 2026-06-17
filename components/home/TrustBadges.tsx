import { supabaseAdmin } from "@/lib/supabase-admin";
import TrustBadgesClient, { Badge } from "./TrustBadgesClient";

async function getData(): Promise<{ phone: string; badges: Badge[] }> {
  const [{ data: settings }, { data: badges }] = await Promise.all([
    supabaseAdmin.from("site_settings").select("phone").single(),
    supabaseAdmin
      .from("trust_badges")
      .select("emoji, title, subtitle, detail, is_call")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  return {
    phone: settings?.phone || "+971522305216",
    badges: (badges as Badge[]) || [],
  };
}

export default async function TrustBadges() {
  const { phone, badges } = await getData();
  if (!badges.length) return null;
  return <TrustBadgesClient phone={phone} badges={badges} />;
}
