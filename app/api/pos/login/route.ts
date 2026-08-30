export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { login, setSessionCookie } from "@/lib/pos/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const result = await login(
    String(body?.staffId ?? ""),
    String(body?.pin ?? ""),
    String(body?.device ?? ""),
  );

  if (!result.ok) {
    /* 401 whatever the reason. The screen shows one message for a bad ID and a
       bad PIN alike, and a different status code would give that away. */
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  setSessionCookie(result.token);
  return NextResponse.json({ staff: result.staff });
}
