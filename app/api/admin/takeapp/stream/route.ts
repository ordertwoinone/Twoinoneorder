export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/* Vercel caps a serverless response; the client reconnects, but a long window
   means it rarely has to. */
export const maxDuration = 300;

import { createClient } from "@supabase/supabase-js";
import { fromOrderRow, type TakeAppOrderRow } from "@/lib/takeapp-order-row";

/**
 * Live order events, pushed to admin → Live Orders over SSE.
 *
 * The subscription to takeapp_orders runs *here*, on the service-role key,
 * rather than in the browser: these rows carry customer names and phone
 * numbers, and an admin signs in with the same Supabase role as any customer
 * who signed in with Google — so a client-side subscription could not be
 * locked to admins alone. Middleware keeps this route behind the admin session
 * like the rest of /api/admin.
 *
 * Supabase Realtime is also what makes this work on serverless: the webhook
 * and this stream are different instances, and the database is the broker
 * between them.
 */
export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { realtime: { params: { eventsPerSecond: 20 } } },
  );

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          /* the client went away between the check and the write */
        }
      };

      const channel = supabase
        .channel("takeapp-orders-admin")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "takeapp_orders" },
          (payload) => {
            const row = payload.new as TakeAppOrderRow | null;
            if (!row?.id) return;
            send("order", {
              // INSERT means take.app had never sent us this order before.
              isNew: payload.eventType === "INSERT",
              event: row.last_event,
              order: fromOrderRow(row),
            });
          },
        )
        .subscribe((status) => {
          send("status", { status });
        });

      send("ready", { at: new Date().toISOString() });

      // Proxies drop a connection that goes quiet; a comment every 25s keeps
      // it open without reaching the client's onmessage.
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          /* same as above */
        }
      }, 25_000);

      const shutdown = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        supabase.removeChannel(channel);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", shutdown);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // nginx and friends buffer by default, which would hold events back.
      "X-Accel-Buffering": "no",
    },
  });
}
