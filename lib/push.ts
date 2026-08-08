import webpush from "web-push";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/**
 * Sending order alerts to admin devices.
 *
 * This is the only path that reaches someone with the browser closed, so it
 * runs from the webhook rather than from a screen: by definition nobody is
 * looking when it matters.
 */

export interface PushPayload {
  title: string;
  body: string;
  /** Where tapping the notification should land. */
  url?: string;
  /** Groups replacements — a second event for one order replaces the first. */
  tag?: string;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

let configured = false;

/** Returns false when the VAPID keys are missing, so callers can skip quietly. */
function configure(): boolean {
  if (configured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@twoinoneae.com",
    publicKey,
    privateKey,
  );
  configured = true;
  return true;
}

/**
 * Pushes to every subscribed admin device.
 *
 * A push service answers 404 or 410 for a subscription that is gone — the app
 * uninstalled, the browser data cleared — and will keep doing so forever, so
 * those rows are deleted as they are found. Everything is best-effort: a
 * notification that cannot be delivered must never fail the caller, which is a
 * webhook that still has to answer take.app with a 200.
 */
export async function pushToAdmins(payload: PushPayload, userIds?: string[]): Promise<number> {
  if (!configure()) return 0;

  let query = supabaseAdminLive.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (userIds?.length) query = query.in("user_id", userIds);

  const { data, error } = await query;
  if (error || !data?.length) return 0;

  const body = JSON.stringify(payload);
  const dead: string[] = [];

  const results = await Promise.allSettled(
    (data as SubscriptionRow[]).map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body,
          { TTL: 600, urgency: "high" },
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(row.id);
        /* Logged, not swallowed: a push that stops arriving is otherwise
           invisible — the phone simply goes quiet and nobody knows why. */
        console.error(
          "[push] failed for", row.endpoint.slice(0, 60),
          status ? `status ${status}` : "",
          err instanceof Error ? err.message : err,
        );
        throw err;
      }
    }),
  );

  if (dead.length) {
    await supabaseAdminLive.from("push_subscriptions").delete().in("id", dead);
    console.warn(`[push] dropped ${dead.length} dead subscription(s)`);
  }

  return results.filter((r) => r.status === "fulfilled").length;
}
