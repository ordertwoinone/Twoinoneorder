export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { answerTio, rateLimited } from "@/lib/kiosk/tio-server";
import { TIO_QUERY_MAX, isTioChip, type TioReply, type TioRequest } from "@/lib/kiosk/tio";

/**
 * TIO, the kiosk's assistant: a pairing when a dish goes in, a finishing touch
 * at review, and the Help-me-choose sheet.
 *
 * Everything that comes in is re-shaped before it goes anywhere near a prompt —
 * ids are strings of a sane length, the question is capped — and everything
 * that goes out has been checked against the live menu in tio-server.ts.
 */

const EMPTY: TioReply = { message: "", itemIds: [], allergy: false, source: "rules" };

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function ids(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).slice(0, 64)).filter(Boolean).slice(0, 60);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const kind = body?.kind;
  if (kind !== "pair" && kind !== "checkout" && kind !== "ask") {
    return NextResponse.json({ error: "Unknown request" }, { status: 400 });
  }

  const req: TioRequest = {
    kind,
    lang: body?.lang === "ar" ? "ar" : "en",
    cart: ids(body?.cart),
    added: typeof body?.added === "string" ? body.added.slice(0, 64) : undefined,
    exclude: ids(body?.exclude),
    query: typeof body?.query === "string" ? body.query.replace(/\s+/g, " ").trim().slice(0, TIO_QUERY_MAX) : undefined,
    chip: isTioChip(body?.chip) ? body.chip : undefined,
  };

  if (kind === "ask" && !req.query) {
    return NextResponse.json({ error: "Ask TIO something" }, { status: 400 });
  }

  if (rateLimited(clientIp(request), kind)) {
    // A suggestion that does not appear is invisible; a question gets told.
    return kind === "ask"
      ? NextResponse.json({ error: "TIO needs a moment — please try again shortly." }, { status: 429 })
      : NextResponse.json(EMPTY);
  }

  try {
    const reply = await answerTio(req);
    return NextResponse.json(reply, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[tio] route failed", err);
    return NextResponse.json(EMPTY);
  }
}
