export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { endSession } from "@/lib/pos/auth";

export async function POST() {
  // The row goes, not just the cookie: signing out has to end the session for
  // the token as well, or a copied cookie keeps working until it expires.
  await endSession();
  return NextResponse.json({ ok: true });
}
