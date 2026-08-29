export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { insertRow } from "@/lib/admin-write";
import { toDeviceSlug } from "@/lib/kiosk/types";

export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("kiosk_devices")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  // The slug is the address of a physical screen, so it is derived here rather
  // than taken as typed — a stray space would give a panel a URL nobody can type.
  const slug = toDeviceSlug(body.slug || body.label);

  if (!slug) {
    return NextResponse.json({ error: "Give the screen a name" }, { status: 400 });
  }

  const { data, error } = await insertRow("kiosk_devices", { ...body, slug });

  if (error) {
    // The UNIQUE on slug is what makes two screens sharing an address impossible.
    const clash = error.code === "23505" || /duplicate|unique/i.test(error.message ?? "");
    return NextResponse.json(
      { error: clash ? `There is already a screen at /kiosk/${slug}` : error.message },
      { status: clash ? 409 : 500 },
    );
  }

  revalidatePath("/kiosk");
  return NextResponse.json(data, { status: 201 });
}
