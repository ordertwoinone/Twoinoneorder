import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(url, serviceRoleKey);

/**
 * Service-role client that opts every request out of Next's data cache.
 *
 * supabase-js reaches PostgREST through `fetch`, which Next caches by default.
 * In an admin route that bites twice over: a list request can be answered with
 * a snapshot from before the screen's own last write (a toggled row reads back
 * as "off" while the home page already shows it), and a repeated write — same
 * URL and body, e.g. switching a row off again — can be answered from the cache
 * without ever reaching the database.
 *
 * Route-level `fetchCache` / `unstable_noStore` do not reliably reach this
 * fetch, so the opt-out lives on the client. Admin API routes must use this
 * client; `supabaseAdmin` stays cacheable so public pages keep their ISR
 * behaviour.
 */
export const supabaseAdminLive = createClient(url, serviceRoleKey, {
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, cache: "no-store" }),
  },
});
