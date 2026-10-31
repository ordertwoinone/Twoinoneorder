import type { OrderItem } from "@/lib/kitchen-orders";

const KITCHEN_STATUS: Record<string, string> = { new: "New", preparing: "Preparing", served: "Served" };

/** An order as the Payments and Credit screens show it. */
export interface ServedOrder {
  id: string;
  order_number: number;
  table_code: string | null;
  guests: number;
  waiter_name: string | null;
  items: OrderItem[];
  total: number | string;
  status: string;
  payment_method: "card" | "cash" | "credit" | null;
  paid_at: string | null;
  credit_name?: string | null;
  credit_phone?: string | null;
  credit_at: string | null;
  created_at: string;
}

export const money = (amount: number) => `AED ${amount.toFixed(2)}`;
export const when = (iso: string) =>
  new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function OrderMoneyCard({
  order, badge, badgeCls, children,
}: {
  order: ServedOrder;
  badge: string;
  badgeCls: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">
            #{order.order_number}{order.table_code ? ` · Table ${order.table_code}` : ""}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {when(order.created_at)} · {order.guests} {order.guests === 1 ? "person" : "people"}
          </p>
          <p className="text-xs font-medium text-gray-700 mt-0.5">
            {order.waiter_name ? `Waiter: ${order.waiter_name}` : "No waiter"}
            {` · Kitchen: ${KITCHEN_STATUS[order.status] ?? order.status}`}
          </p>
        </div>
        <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeCls}`}>{badge}</span>
      </div>

      <ul className="mt-3 flex-1 space-y-1 text-sm">
        {(order.items ?? []).map((item, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="text-gray-800">
              {item.qty} × {item.name}
              {item.addons?.length ? <span className="block text-xs text-gray-500">{item.addons.map((a) => a.name).join(", ")}</span> : null}
            </span>
            <span className="shrink-0 text-gray-600">{money(Number(item.line_total))}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-sm font-semibold text-gray-600">Total</span>
        <span className="text-base font-bold text-gray-900">{money(Number(order.total))}</span>
      </div>

      {children}
    </article>
  );
}
