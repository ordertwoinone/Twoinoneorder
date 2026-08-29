export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getKioskData } from "@/lib/kiosk/server";

/**
 * The whole screen's worth of data, for a kiosk that has been standing all day.
 *
 * The page server-renders the same payload at boot; this is what the screen
 * re-reads each time it falls back to idle, so a price or a sold-out dish
 * reaches it without anyone walking over and reloading the browser.
 */
export async function GET() {
  const data = await getKioskData();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
