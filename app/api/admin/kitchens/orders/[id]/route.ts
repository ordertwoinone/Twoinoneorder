export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { updateRow } from "@/lib/admin-write";
import { supabaseAdminLive } from "@/lib/supabase-admin";

const STATUSES = ["new", "preparing", "ready", "served", "cancelled"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  if (!STATUSES.includes(body?.status)) {
    return NextResponse.json({ error: "That status isn't valid." }, { status: 400 });
  }

  const { data: order } = await supabaseAdminLive.from("kitchen_orders").select("*").eq("id", params.id).maybeSingle();
  const now = new Date().toISOString();

  // Tolerates columns not existing yet: the status still saves, untimed.
  const { error } = await updateRow("kitchen_orders", params.id, {
    status: body.status,
    events: [...(order?.events ?? []), { type: body.status, at: now }],
    ...(body.status === "ready" ? { ready_at: now } : {}),
    ...(body.status === "served" ? { served_at: now } : {}),
  });

  // The database still only knows the old statuses.
  if ((error as { code?: string } | null)?.code === "23514") {
    return NextResponse.json({ error: "Run supabase/kitchen_order_ready.sql in the Supabase SQL editor first." }, { status: 500 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: params.id, status: body.status });
}
