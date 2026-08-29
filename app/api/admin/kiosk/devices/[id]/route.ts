export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { updateRow } from "@/lib/admin-write";
import { toDeviceSlug } from "@/lib/kiosk/types";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const slug = toDeviceSlug(body.slug || body.label);

  if (!slug) {
    return NextResponse.json({ error: "Give the screen a name" }, { status: 400 });
  }

  const { data, error } = await updateRow("kiosk_devices", params.id, { ...body, slug });

  if (error) {
    const clash = error.code === "23505" || /duplicate|unique/i.test(error.message ?? "");
    return NextResponse.json(
      { error: clash ? `There is already a screen at /kiosk/${slug}` : error.message },
      { status: clash ? 409 : 500 },
    );
  }

  revalidatePath("/kiosk");
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  /* The orders this panel took keep their kiosk_device_id set to null by the
     foreign key, and keep the panel's name in table_section because it was
     copied at the time. Retiring hardware must not rewrite the ledger. */
  const { error } = await supabaseAdminLive.from("kiosk_devices").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/kiosk");
  return NextResponse.json({ success: true });
}
