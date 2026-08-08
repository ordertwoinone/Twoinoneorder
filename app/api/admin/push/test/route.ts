export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { currentMember } from "@/lib/admin-session";
import { pushToAdmins } from "@/lib/push";

/**
 * Sends a notification to the caller's own devices.
 *
 * Worth having: whether a phone actually rings depends on the device, the
 * install, and permissions granted weeks ago — none of which the server can
 * see. This is the only way to find out without waiting for a real order.
 */
export async function POST() {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sent = await pushToAdmins(
    {
      title: "Test alert",
      body: "Notifications are working. Real orders will look like this.",
      url: "/admin/live-orders",
      tag: "takeapp-test",
    },
    [member.userId],
  );

  return NextResponse.json({
    sent,
    message: sent > 0
      ? `Sent to ${sent} device${sent === 1 ? "" : "s"}.`
      : "No devices are registered for this account yet.",
  });
}
