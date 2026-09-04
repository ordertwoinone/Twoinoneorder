import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireShift } from "@/lib/pos/guard";
import { getPosMenu } from "@/lib/pos/menu-server";
import TillScreen from "./TillScreen";

export const dynamic = "force-dynamic";

export default async function TillPage() {
  const { staff, stale } = await requireShift();

  const [{ settings, categories, items }, tablesRes] = await Promise.all([
    getPosMenu(),
    /* The same floor plan the booking page uses, so a table means the same
       thing whether it was reserved online or sat at the door. Failing to read
       it is not fatal — PayDialog falls back to a typed table number. */
    supabaseAdmin
      .from("booking_tables")
      .select("code")
      .eq("is_active", true)
      .order("sort_order")
      .order("code"),
  ]);

  return (
    <TillScreen
      staff={staff}
      settings={settings}
      categories={categories}
      items={items}
      tables={((tablesRes.data ?? []) as { code: string }[]).map((t) => t.code)}
      stale={stale}
    />
  );
}
