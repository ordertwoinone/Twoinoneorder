export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { updateRow } from "@/lib/admin-write";

const STATUSES = ["new", "preparing", "served", "cancelled"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  if (!STATUSES.includes(body?.status)) {
    return NextResponse.json({ error: "That status isn't valid." }, { status: 400 });
  }

  // Tolerates served_at not existing yet: the status still saves, untimed.
  const { error } = await updateRow("kitchen_orders", params.id, {
    status: body.status,
    ...(body.status === "served" ? { served_at: new Date().toISOString() } : {}),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: params.id, status: body.status });
}
