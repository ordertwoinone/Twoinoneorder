export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { fetchCarriers, apiKey, ShipdayError } from "@/lib/shipday";

/**
 * The driver roster, read live from Shipday.
 *
 * This is the one part of the section that needs the API key, and it is
 * deliberately the least important part: the board itself is fed by the
 * webhook. A missing or rejected key comes back as a reason the screen can
 * show in a small panel, never as a failure that empties the deliveries.
 */
export async function GET() {
  if (!apiKey()) {
    return NextResponse.json(
      {
        carriers: [],
        error: "No Shipday API key is set. Add SHIPDAY_API_KEY to see the driver roster.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const carriers = await fetchCarriers();
    return NextResponse.json({ carriers }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const message = err instanceof ShipdayError ? err.message : "Could not reach Shipday.";
    /* 200 with a reason, not an error status: the roster is a side panel, and
       the screen around it is still perfectly usable without it. */
    return NextResponse.json({ carriers: [], error: message }, { headers: { "Cache-Control": "no-store" } });
  }
}
