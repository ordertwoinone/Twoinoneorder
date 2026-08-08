export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentMember } from "@/lib/admin-session";

/**
 * Registers the device the caller is on, or forgets it again.
 *
 * The endpoint is unique per device per browser, so re-subscribing on a phone
 * that is already registered updates its keys rather than adding a duplicate.
 */
export async function POST(request: Request) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const endpoint = String(body?.subscription?.endpoint ?? "");
  const p256dh = String(body?.subscription?.keys?.p256dh ?? "");
  const auth = String(body?.subscription?.keys?.auth ?? "");

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "That is not a usable push subscription." }, { status: 400 });
  }

  const row = {
    user_id: member.userId,
    email: member.email,
    endpoint,
    p256dh,
    auth,
    user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? "",
  };

  const { error } = await supabaseAdminLive
    .from("push_subscriptions")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(row as any, { onConflict: "endpoint" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscribed: true });
}

export async function DELETE(request: Request) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const endpoint = String((await request.json())?.endpoint ?? "");
  if (!endpoint) return NextResponse.json({ error: "No endpoint given." }, { status: 400 });

  // Scoped to the caller: nobody unsubscribes somebody else's phone.
  const { error } = await supabaseAdminLive
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", member.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscribed: false });
}
