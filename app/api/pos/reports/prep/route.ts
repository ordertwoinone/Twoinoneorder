export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";
import { can } from "@/lib/pos/permissions";
import { LATE_AFTER_MINUTES } from "@/lib/pos/constants";
import { sourceOrderCode } from "@/lib/order-source";
import { loadSourceDirectory, sourceFrom } from "@/lib/order-source-server";
import { businessDateFor, businessDayRange } from "@/lib/pos/business-day";

/**
 * How long tickets took, and which ones went over.
 *
 * Prep time is the gap between the order being rung up and the kitchen first
 * pressing Done — supabase/order_prep_time.sql stamps `ready_at` once and never
 * again, so a ticket reopened and finished twice keeps the moment the customer
 * could first have had it.
 *
 * Only orders carrying that stamp have a prep time at all. The rest are counted
 * and named rather than guessed at: a ticket the kitchen never marked done, and
 * one still cooking right now, are two different facts and neither of them is a
 * number of minutes. Filling either in with an estimate would put invented
 * figures into the one report a branch would use to argue about its kitchen.
 */

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

function asDate(value: string | null): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/* ready_at arrives with a hand-run migration. Asked for separately so a branch
   that has deployed this and not yet run that file gets an empty report saying
   so, rather than PostgREST failing the whole select with a 400. */
const BASE =
  "id, type, order_number, status, order_type, table_section, guest_name, items, total_amount, created_at, pos_staff_uuid, kiosk_device_id";

export async function GET(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(staff, "reports")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const today = businessDateFor();
  const from = asDate(params.get("from")) ?? today;
  const to = asDate(params.get("to")) ?? today;

  /* Trading days, on the branch's 5am boundary — the same window the sales
     report and the closes use, so "12 late on Tuesday" means the same Tuesday
     everywhere on this screen. */
  const { start, end } = businessDayRange(from, to);

  const query = (columns: string) =>
    supabaseAdminLive
      .from("bookings")
      .select(columns)
      .in("type", ["pos", "kiosk"])
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: false })
      .limit(3000);

  let res = await query(`${BASE}, ready_at`);
  let hasPrepColumn = true;
  if (res.error) {
    hasPrepColumn = false;
    res = await query(BASE);
  }
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });

  const rows = (res.data ?? []) as unknown as Record<string, unknown>[];

  /* The one place that turns a booking's three source columns into a prefix, a
     channel and a name. Used here rather than reading pos_staff directly so a
     ticket's code on this report is character-for-character the one on the
     board, the receipt and the invoice. */
  const directory = await loadSourceDirectory();

  const now = Date.now();
  const lateMs = LATE_AFTER_MINUTES * 60_000;

  interface Ticket {
    id: string;
    code: string;
    /** "Kiosk · UNIVERCITY TAB 1", "Counter · THOMAS" — who took it, and where. */
    source: string;
    channel: string;
    guest: string;
    where: string;
    itemCount: number;
    total: number;
    createdAt: string;
    readyAt: string;
    /** Minutes from rung up to the kitchen pressing Done. */
    minutes: number;
    /** Still cooking: the clock is running, so this is minutes so far. */
    running: boolean;
    status: string;
  }

  const late: Ticket[] = [];
  let measured = 0;
  let measuredTotalMs = 0;
  let stillCooking = 0;
  /** Finished, but the kitchen never pressed Done — no prep time to report. */
  let unrecorded = 0;

  for (const row of rows) {
    const status = String(row.status ?? "").toLowerCase();
    if (status === "cancelled") continue;

    const created = new Date(String(row.created_at)).getTime();
    if (!Number.isFinite(created)) continue;

    const readyRaw = hasPrepColumn ? (row.ready_at as string | null) : null;
    const ready = readyRaw ? new Date(readyRaw).getTime() : null;
    /* Pending and confirmed are the two the kitchen still has. Anything else
       has left the pass, whether or not anybody stamped it on the way. */
    const running = status === "pending" || status === "confirmed";

    let ms: number | null = null;
    if (ready !== null && Number.isFinite(ready)) {
      ms = Math.max(0, ready - created);
      measured += 1;
      measuredTotalMs += ms;
    } else if (running) {
      ms = Math.max(0, now - created);
      stillCooking += 1;
    } else {
      unrecorded += 1;
      continue;
    }

    if (ms < lateMs) continue;

    const lines = Array.isArray(row.items) ? (row.items as { qty?: number; cancelled?: boolean }[]) : [];
    const src = sourceFrom(row, directory);

    late.push({
      id: String(row.id),
      code: sourceOrderCode(src, row.order_number as number | null),
      source: src.label,
      channel: src.channel,
      guest: String(row.guest_name ?? "").trim(),
      where: String(row.table_section ?? row.order_type ?? "").trim(),
      itemCount: lines.filter((l) => !l.cancelled).reduce((n, l) => n + (Math.round(num(l.qty)) || 0), 0),
      total: num(row.total_amount),
      createdAt: String(row.created_at),
      readyAt: readyRaw ?? "",
      minutes: Math.round(ms / 60_000),
      running: ready === null,
      status,
    });
  }

  // Worst first. A report about slow tickets opens on the slowest one.
  late.sort((a, b) => b.minutes - a.minutes);

  return NextResponse.json({
    from,
    to,
    thresholdMinutes: LATE_AFTER_MINUTES,
    /* False means supabase/order_prep_time.sql has not been run here. The
       screen says so rather than reporting a clean sheet, which is what an
       empty list would otherwise look like. */
    hasPrepColumn,
    totals: {
      orders: rows.length,
      measured,
      late: late.length,
      stillCooking,
      unrecorded,
      averageMinutes: measured > 0 ? Math.round(measuredTotalMs / measured / 60_000) : 0,
      worstMinutes: late.length > 0 ? late[0].minutes : 0,
    },
    orders: late,
  });
}
