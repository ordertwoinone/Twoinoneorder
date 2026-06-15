import { supabaseAdmin } from "@/lib/supabase-admin";
import TrustBadgesClient from "./TrustBadgesClient";

async function getPhone(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("phone")
    .single();
  return data?.phone || "+971522305216";
}

export default async function TrustBadges() {
  const phone = await getPhone();
  return <TrustBadgesClient phone={phone} />;
}
