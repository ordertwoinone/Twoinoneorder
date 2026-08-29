import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Clock, MapPin, ShoppingBag } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DEFAULT_KIOSK_SETTINGS, kioskOrderCode } from "@/lib/kiosk/types";

/**
 * Following an order, from the QR on the kiosk receipt.
 *
 * The address is the order's own uuid, which is unguessable and was handed to
 * exactly one person — so it is the key, and there is nothing to sign in to.
 * Because a link can be forwarded, screenshotted or left on a table, the page
 * shows only what is on the receipt already: what was ordered, what it cost,
 * and how far along it is. No name, no phone number, nothing that identifies
 * whoever placed it.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

interface OrderItem {
  name?: string;
  qty?: number;
  extras?: string;
  line_total?: number | string;
}

/** The three the customer is shown, and where each status sits among them. */
const STAGES = ["Received", "Preparing", "Ready"] as const;

function stageIndex(status: string): number {
  switch ((status || "").toLowerCase()) {
    case "confirmed":
      return 1;
    case "completed":
      return 2;
    default:
      return 0;
  }
}

function money(value: unknown): string {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? `AED ${n.toFixed(2)}` : "—";
}

export default async function OrderStatusPage({ params }: { params: { id: string } }) {
  // Anything that is not a uuid never reaches the database.
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();

  const [orderRes, kioskRes] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      // Named columns, not `*`: the row also holds a name and a phone number,
      // and this page is reachable by anyone holding the link.
      .select("order_number, status, items, total_amount, order_type, created_at, type, table_section")
      .eq("id", params.id)
      .maybeSingle(),
    supabaseAdmin.from("kiosk_settings").select("order_prefix, pickup_counter, ready_minutes_min, ready_minutes_max").limit(1).maybeSingle(),
  ]);

  if (orderRes.error || !orderRes.data) notFound();

  const order = orderRes.data as {
    order_number: number | null;
    status: string | null;
    items: OrderItem[] | null;
    total_amount: number | string | null;
    order_type: string | null;
    created_at: string | null;
    type: string | null;
    table_section: string | null;
  };

  const kiosk = { ...DEFAULT_KIOSK_SETTINGS, ...(kioskRes.data ?? {}) };
  const cancelled = (order.status ?? "").toLowerCase() === "cancelled";
  const current = stageIndex(order.status ?? "");
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <main className="min-h-screen bg-[#FAFAFA] px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">Your order</p>
          <h1 className="mt-1 text-4xl font-black text-gray-900">
            {kioskOrderCode(kiosk.order_prefix, order.order_number)}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {order.order_type || "Pickup"}
            {order.table_section ? ` · ${order.table_section}` : ""}
          </p>

          {cancelled ? (
            <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              This order was cancelled. Please speak to the counter.
            </p>
          ) : (
            <>
              <div className="mt-6 flex items-center">
                {STAGES.map((stage, i) => (
                  <div key={stage} className="flex flex-1 items-center">
                    <div className="flex shrink-0 flex-col items-center gap-1.5">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${
                          i <= current ? "bg-green-600" : "bg-gray-200"
                        }`}
                      >
                        {i < current ? <Check size={14} strokeWidth={3.5} /> : null}
                      </span>
                      <span
                        className={`whitespace-nowrap text-[11px] font-bold ${
                          i <= current ? "text-green-700" : "text-gray-400"
                        }`}
                      >
                        {stage}
                      </span>
                    </div>
                    {i < STAGES.length - 1 && (
                      <span
                        className={`mx-1.5 mb-5 h-0.5 flex-1 ${
                          i < current ? "bg-green-600" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {current < 2 && (
                <p className="mt-5 flex items-center gap-1.5 text-sm text-gray-500">
                  <Clock size={15} />
                  Usually ready in {kiosk.ready_minutes_min}–{kiosk.ready_minutes_max} minutes.
                </p>
              )}
              {current === 2 && (
                <p className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                  Ready — please collect it at the counter.
                </p>
              )}
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
            <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
              <ShoppingBag size={16} />
              What you ordered
            </p>
            <ul className="mt-3 space-y-2.5">
              {items.map((item, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0 text-gray-700">
                    <span className="font-semibold text-gray-900">{item.qty ?? 1}×</span>{" "}
                    {item.name || "Item"}
                    {item.extras && (
                      <span className="block text-xs text-gray-400">{item.extras}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-semibold text-gray-900">
                    {money(item.line_total)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t border-gray-100 pt-3">
              <span className="text-sm font-bold text-gray-900">Total</span>
              <span className="text-xl font-black text-gray-900">{money(order.total_amount)}</span>
            </div>
          </div>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <MapPin size={13} />
          {kiosk.pickup_counter}
        </p>
      </div>
    </main>
  );
}
