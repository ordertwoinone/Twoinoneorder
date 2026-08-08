/**
 * Client for the take.app Merchant API v2 — the live order feed behind
 * admin → Live Orders.
 *
 * The key is a server secret (it can read every order across all four stores),
 * so this module is server-only: the admin screen talks to /api/admin/takeapp
 * and never sees the token.
 */

const BASE_URL = "https://take.app/api/v2/orders";

export type OrderStatus = "draft" | "pending" | "confirmed" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "refunded";
export type FulfillmentStatus = "unfulfilled" | "ready" | "fulfilled";

export interface TakeAppLineItem {
  name: string;
  quantity: number;
  /** Smallest currency unit, e.g. fils. */
  price: number;
  options?: { name?: string; value?: string }[] | null;
}

export interface TakeAppOrder {
  id: string;
  number: string;
  name: string;
  store: { name: string; alias: string } | null;
  order_status: OrderStatus | string;
  payment_status: PaymentStatus | string;
  fulfillment_status: FulfillmentStatus | string;
  customer: { name?: string | null; phone?: string | null } | null;
  line_items: TakeAppLineItem[];
  /** Smallest currency unit — divide by 100 to display. */
  total_amount: number;
  currency: string;
  created_at: string;
  remark?: string | null;
  schedule?: string | null;
}

export interface OrdersPage {
  orders: TakeAppOrder[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface OrderQuery {
  limit?: number;
  order_status?: string;
  payment_status?: string;
  fulfillment_status?: string;
  created_after?: string;
  cursor?: string;
}

/** A failure worth showing the admin verbatim, with the status that caused it. */
export class TakeAppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "TakeAppError";
  }
}

/**
 * The tokens to pull orders with, one per store.
 *
 * A take.app token is bound to a single store — /api/v2/me returns one store,
 * and list-orders has no store filter — so four restaurants means four tokens.
 * They can be listed in TAKEAPP_API_KEYS, comma or newline separated;
 * TAKEAPP_API_KEY stays valid as the single-store spelling of the same thing.
 */
export function apiKeys(): string[] {
  const many = (process.env.TAKEAPP_API_KEYS ?? "")
    .split(/[\s,]+/)
    .map((k) => k.trim())
    .filter(Boolean);

  const one = (process.env.TAKEAPP_API_KEY ?? "").trim();
  const all = one ? [one, ...many] : many;

  // Same token listed twice would double every order it returns.
  return Array.from(new Set(all));
}

/** Enough of a token to name it in an error without printing the secret. */
export function keyLabel(key: string): string {
  return `…${key.slice(-4)}`;
}

/** take.app caps `limit` at 100; anything higher is rejected outright. */
function clampLimit(limit: number | undefined): number {
  if (!limit || Number.isNaN(limit)) return 50;
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

export function buildOrdersUrl(query: OrderQuery): string {
  const params = new URLSearchParams();
  params.set("limit", String(clampLimit(query.limit)));

  (["order_status", "payment_status", "fulfillment_status", "created_after", "cursor"] as const)
    .forEach((key) => {
      const value = query[key];
      if (value) params.set(key, value);
    });

  return `${BASE_URL}?${params.toString()}`;
}

/**
 * One page of orders, newest first as the API returns them.
 *
 * Anything the API says is passed through as a TakeAppError so the screen can
 * tell "your key is wrong" apart from "take.app is down" — a live-order board
 * that silently shows nothing is worse than one showing why.
 */
export async function fetchOrders(query: OrderQuery = {}, key?: string): Promise<OrdersPage> {
  const token = key ?? apiKeys()[0];
  if (!token) {
    throw new TakeAppError(
      500,
      "No take.app token is set. Add TAKEAPP_API_KEYS (one token per store) to the hosting environment.",
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  let res: Response;
  try {
    res = await fetch(buildOrdersUrl(query), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof TakeAppError) throw err;
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new TakeAppError(504, aborted ? "take.app did not respond in time." : "Could not reach take.app.");
  } finally {
    clearTimeout(timer);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (body as { error?: { message?: string } } | null)?.error?.message ??
      `take.app returned ${res.status}.`;
    throw new TakeAppError(res.status, message);
  }

  const payload = body as { data?: unknown; has_more?: boolean; next_cursor?: string | null } | null;
  const data = Array.isArray(payload?.data) ? (payload!.data as TakeAppOrder[]) : [];

  return {
    orders: data,
    hasMore: Boolean(payload?.has_more),
    nextCursor: payload?.next_cursor ?? null,
  };
}

export interface MergedOrders {
  orders: TakeAppOrder[];
  /** One line per store token that could not be read. */
  warnings: string[];
}

/**
 * Every store's orders in one list.
 *
 * Each token is asked separately and the results merged, because the API has no
 * way to ask for more than one store at once. A store that fails is reported
 * rather than thrown: three restaurants' orders on screen beats none because
 * the fourth token expired.
 *
 * Cursor paging is deliberately not carried through here — a cursor belongs to
 * one store's list and means nothing to the others.
 */
export async function fetchAllStoreOrders(query: OrderQuery = {}): Promise<MergedOrders> {
  const keys = apiKeys();
  if (keys.length === 0) {
    return {
      orders: [],
      warnings: ["No take.app token is set. Add TAKEAPP_API_KEYS to the hosting environment."],
    };
  }

  const settled = await Promise.allSettled(
    keys.map((key) => fetchOrders({ ...query, cursor: undefined }, key)),
  );

  const orders: TakeAppOrder[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  settled.forEach((result, i) => {
    if (result.status === "rejected") {
      const reason = result.reason instanceof Error ? result.reason.message : "could not be read";
      warnings.push(`Store token ${keyLabel(keys[i])}: ${reason}`);
      return;
    }
    result.value.orders.forEach((order) => {
      const id = String(order.id);
      if (seen.has(id)) return;
      seen.add(id);
      orders.push(order);
    });
  });

  orders.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return { orders, warnings };
}
