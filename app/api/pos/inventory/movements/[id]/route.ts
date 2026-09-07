export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { inventoryStaff } from "@/lib/inventory/api";

/**
 * Removing an entry keyed in by mistake.
 *
 * Not the adjustments a posted count wrote. Those are the count's decision
 * rather than anybody's typing, and deleting one would leave a posted sheet
 * claiming a variance the ledger no longer carries — the books and the count
 * would disagree with no row left to explain why.
 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { deny } = await inventoryStaff();
  if (deny) return deny;

  const existing = await supabaseAdminLive
    .from("inventory_movements")
    .select("id, kind")
    .eq("id", params.id)
    .maybeSingle();

  const row = existing.data as { kind?: string } | null;
  if (!row) return NextResponse.json({ error: "That entry is already gone" }, { status: 404 });

  if (row.kind === "count_adjustment") {
    return NextResponse.json(
      { error: "This came from a posted stock count and cannot be deleted. Count again to correct it." },
      { status: 409 },
    );
  }

  const { error } = await supabaseAdminLive.from("inventory_movements").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
