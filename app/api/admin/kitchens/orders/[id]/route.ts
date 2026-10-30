export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";

const STATUSES = ["new", "preparing", "served", "cancelled"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  if (!STATUSES.includes(body?.status)) {
    return NextResponse.json({ error: "That status isn't valid." }, { status: 400 });
  }

  const { data, error } = await supabaseAdminLive
    .from("kitchen_orders")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select("id, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
