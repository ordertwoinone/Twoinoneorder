export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  if (typeof body?.paid !== "boolean") {
    return NextResponse.json({ error: "Say whether the order is paid." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdminLive
    .from("kitchen_orders")
    .update({ paid_at: body.paid ? now : null, updated_at: now })
    .eq("id", params.id)
    .eq("status", "served")
    .select("id, paid_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
