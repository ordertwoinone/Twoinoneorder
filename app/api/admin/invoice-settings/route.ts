export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { updateRow } from "@/lib/admin-write";
import { getInvoiceSettings } from "@/lib/invoice-settings-server";
import { DEFAULT_INVOICE_SETTINGS } from "@/lib/invoice-settings";

export async function GET() {
  return NextResponse.json(await getInvoiceSettings());
}

export async function PUT(request: Request) {
  const body = await request.json();

  /* Only the settings' own keys — the form round-trips whatever it was handed,
     and id / created_at are not the caller's to set. */
  const fields: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULT_INVOICE_SETTINGS)) {
    if (key in body) fields[key] = body[key];
  }

  /* The table holds one row. Seeded by the migration, but a database where the
     INSERT was skipped still has to be able to save. */
  const { data: existing } = await supabaseAdminLive
    .from("invoice_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  const id = (existing as { id?: string } | null)?.id;

  const { data, error } = id
    ? await updateRow("invoice_settings", id, fields)
    : await supabaseAdminLive.from("invoice_settings").insert([fields]).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/invoice", "layout");
  return NextResponse.json(data);
}
