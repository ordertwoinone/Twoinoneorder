export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/* Vercel caps a serverless response; the client reconnects, but a long window
   means it rarely has to. */
export const maxDuration = 300;

import { createClient } from "@supabase/supabase-js";
import type { ShipdayDeliveryRow } from "@/lib/shipday";

/**
 * Delivery updates, pushed to admin → Shipday Delivery over SSE.
 *
 * The subscription runs here on the service-role key rather than in the
 * browser, for the same reason as the Live Orders stream: these rows carry
 * customer addresses and a driver's phone number, and an admin signs in with
 * the same Supabase role as any customer, so a client-side subscription could
 * not be locked to admins alone. Middleware keeps this route behind the admin
 * session like the rest of /api/admin.
 *
 * This is what makes a driver assignment appear without anyone refreshing: the
 * webhook and this stream are different serverless instances, and the database
 * is the broker between them.
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
        .channel("shipday-deliveries-admin")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "shipday_deliveries" },
          (payload) => {
            /* A delete carries no new row, only the old one — the screen needs
               the id so it can drop it from the board. */
            if (payload.eventType === "DELETE") {
              const gone = payload.old as { id?: string } | null;
              if (gone?.id) send("removed", { id: gone.id });
              return;
            }

            const row = payload.new as ShipdayDeliveryRow | null;
            if (!row?.id) return;
            send("delivery", {
              // INSERT means Shipday had never sent us this delivery before.
              isNew: payload.eventType === "INSERT",
              delivery: row,
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
