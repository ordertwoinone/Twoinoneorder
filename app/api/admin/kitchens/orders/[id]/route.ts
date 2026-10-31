export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { updateRow } from "@/lib/admin-write";

const STATUSES = ["new", "preparing", "ready", "served", "cancelled"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  if (!STATUSES.includes(body?.status)) {
    return NextResponse.json({ error: "That status isn't valid." }, { status: 400 });
  }

  // Tolerates served_at not existing yet: the status still saves, untimed.
  const { error } = await updateRow("kitchen_orders", params.id, {
    status: body.status,
    ...(body.status === "ready" ? { ready_at: new Date().toISOString() } : {}),
    ...(body.status === "served" ? { served_at: new Date().toISOString() } : {}),
  });

  // The database still only knows the old statuses.
  if ((error as { code?: string } | null)?.code === "23514") {
    return NextResponse.json({ error: "Run supabase/kitchen_order_ready.sql in the Supabase SQL editor first." }, { status: 500 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: params.id, status: body.status });
}
