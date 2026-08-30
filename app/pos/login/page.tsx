import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
import LoginScreen from "./LoginScreen";

export const dynamic = "force-dynamic";

/** The branch this till belongs to, as the login screen names it. */
async function branchName(): Promise<string> {
  const { data } = await supabaseAdmin.from("kalba_hero").select("name").limit(1).maybeSingle();
  return data?.name?.trim() || "Two in One Restaurant";
}

export default async function PosLoginPage() {
  // Already signed in: go straight through rather than asking again.
  if (await currentStaff()) redirect("/pos");
  return <LoginScreen branchName={await branchName()} />;
}
