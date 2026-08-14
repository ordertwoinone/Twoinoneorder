export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/**
 * Which of the hand-run migrations this database is still missing.
 *
 * The writes shed columns the database has not got, so an edit saves rather
 * than failing — but that turns "my photo will not stick" into a mystery. This
 * lets the editor say plainly, before anything is typed, which file to run.
 *
 * Each probe asks for one column and reads the error. Cheap, and it needs no
 * privileges beyond the ones the admin routes already use.
 */

const CHECKS: { column: string; table: string; migration: string; needed: string }[] = [
  {
    table: "kalba_item_addons",
    column: "image_url",
    migration: "supabase/kalba_item_addons.sql",
    needed: "photos on add-on options",
  },
  {
    table: "kalba_item_addons",
    column: "group_id",
    migration: "supabase/kalba_addon_groups.sql",
    needed: "choice groups",
  },
  {
    table: "kalba_popular_items",
    column: "discount_percent",
    migration: "supabase/kalba_item_discount.sql",
    needed: "per-item offers",
  },
  {
    table: "kalba_popular_items",
    column: "description",
    migration: "supabase/kalba_popular_description.sql",
    needed: "item descriptions",
  },
  {
    table: "kalba_popular_items",
    column: "show_in_deals",
    migration: "supabase/home_deals.sql",
    needed: "the Deals strip",
  },
];

export async function GET() {
  const results = await Promise.all(
    CHECKS.map(async (check) => {
      const { error } = await supabaseAdminLive
        .from(check.table)
        .select(check.column)
        .limit(1);
      return { ...check, missing: Boolean(error) };
    }),
  );

  const missing = results.filter((r) => r.missing);

  return NextResponse.json({
    ok: missing.length === 0,
    missing: missing.map(({ migration, needed }) => ({ migration, needed })),
  });
}
