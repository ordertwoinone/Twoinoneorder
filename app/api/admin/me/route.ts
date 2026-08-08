export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { currentMember } from "@/lib/admin-session";

/**
 * The signed-in member's own access, for the sidebar to filter itself by.
 *
 * Reachable by every member whatever their areas (see MEMBER_PATHS), and
 * answers `member: null` rather than 403 when there is nobody to report.
 */
export async function GET() {
  const member = await currentMember();
  return NextResponse.json({ member }, { headers: { "Cache-Control": "no-store" } });
}
