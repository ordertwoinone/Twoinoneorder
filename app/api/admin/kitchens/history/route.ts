export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";

const PAGE_SIZE = 50;
const SUM_BATCH = 1000;

// No credit_name or credit_phone: those stay with the Credit permission.
const COLUMNS = "id, order_number, table_code, guests, waiter_name, items, total, status, payment_method, paid_at, created_at";

const STATUSES = ["new", "preparing", "served", "cancelled"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The filters, applied alike to the page of rows and to the totals. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, params: URLSearchParams) {
  let q = query;

  // The restaurant's own day, whatever timezone the server runs in.
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (DATE.test(from)) q = q.gte("created_at", `${from}T00:00:00+04:00`);
  if (DATE.test(to)) q = q.lte("created_at", `${to}T23:59:59.999+04:00`);

  const status = params.get("status") ?? "";
  if (STATUSES.includes(status)) q = q.eq("status", status);

  const payment = params.get("payment") ?? "";
  if (payment === "card" || payment === "cash") q = q.eq("payment_method", payment).not("paid_at", "is", null);
  if (payment === "credit") q = q.eq("payment_method", "credit").is("paid_at", null);
  if (payment === "unpaid") q = q.eq("status", "served").is("payment_method", null).is("paid_at", null);

  // Characters that would change the meaning of the filter are dropped.
  const search = (params.get("q") ?? "").replace(/[,()*%\\"]/g, " ").trim().slice(0, 40);
  if (search) {
    const number = /^#?\d+$/.test(search) ? search.replace("#", "") : null;
    q = q.or(
      [
        number && `order_number.eq.${number}`,
        `table_code.ilike.%${search}%`,
        `waiter_name.ilike.%${search}%`,
      ].filter(Boolean).join(","),
    );
  }
  return q;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const start = (page - 1) * PAGE_SIZE;

  const { data, error, count } = await applyFilters(
    supabaseAdminLive.from("kitchen_orders").select(COLUMNS, { count: "exact" }),
    params,
  )
    .order("created_at", { ascending: false })
    .range(start, start + PAGE_SIZE - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  /* Summed across every match rather than this page, read in batches because a
     single read stops at 1,000 rows. Cancelled orders earned nothing. */
  let sales = 0;
  for (let offset = 0; ; offset += SUM_BATCH) {
    const { data: batch, error: sumError } = await applyFilters(
      supabaseAdminLive.from("kitchen_orders").select("total").neq("status", "cancelled"),
      params,
    )
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + SUM_BATCH - 1);
    if (sumError) return NextResponse.json({ error: sumError.message }, { status: 500 });
    const rows = (batch ?? []) as { total: number | string }[];
    sales += rows.reduce((sum, r) => sum + Number(r.total), 0);
    if (rows.length < SUM_BATCH) break;
  }

  return NextResponse.json({
    orders: data,
    total: count ?? 0,
    sales: Math.round(sales * 100) / 100,
    pageSize: PAGE_SIZE,
  });
}
