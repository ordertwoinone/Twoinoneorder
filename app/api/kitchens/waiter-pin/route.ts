export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { isWaiterPin, verifyWaiterPin } from "@/lib/kitchen-waiters";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!isWaiterPin(body?.pin)) {
    return NextResponse.json({ error: "wrong" }, { status: 401 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const result = await verifyWaiterPin(body.pin, ip);
  if (result.status === "ok") return NextResponse.json({ name: result.name, token: result.token });

  const status = result.status === "locked" ? 429 : result.status === "unavailable" ? 503 : 401;
  return NextResponse.json({ error: result.status }, { status });
}
