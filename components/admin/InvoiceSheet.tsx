"use client";

import {
  invoiceNumber,
  orderTypeLabel,
  VAT_PERCENT,
  type InvoiceOrder,
} from "@/lib/invoice";
import {
  normalizeInvoiceSettings,
  type InvoiceSettings,
} from "@/lib/invoice-settings";

/**
 * The invoice itself, drawn once and used twice: the page staff print, and the
 * live preview in admin → Invoice. There is no second rendering to keep in step,
 * so what the editor shows is what the printer produces.
 *
 * Deliberately plain — black on white, one column, no page chrome — because
 * every pixel here ends up on thermal paper or A4.
 */

export default function InvoiceSheet({
  order,
  settings,
  fallbackLogo = "",
}: {
  order: InvoiceOrder;
  settings?: Partial<InvoiceSettings> | null;
  /** admin → Settings logo, used when the invoice has none of its own. */
  fallbackLogo?: string;
}) {
  const s = normalizeInvoiceSettings(settings);
  const logo = s.logo_url || fallbackLogo;
  const money = (amount: number) =>
    `${s.currency_symbol ? `${s.currency_symbol} ` : ""}${amount.toFixed(2)}`;

  const placed = order.created_at ? new Date(order.created_at) : null;
  const date = placed
    ? placed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const time = placed
    ? placed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "";

  return (
    <div className="bg-white px-10 py-8 text-black print:px-8 print:py-8">
      {/* Head */}
      <header className="text-center">
        {s.show_logo && logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="mx-auto mb-4 h-16 w-auto object-contain" />
        )}
        {s.business_name && <p className="text-[13px] font-semibold">{s.business_name}</p>}
        {s.branch_line && <p className="text-[13px]">{s.branch_line}</p>}
        {s.trn_number && (
          <p className="text-[13px]">
            {s.trn_label} {s.trn_number}
          </p>
        )}
        {s.tel_number && (
          <p className="text-[13px]">
            {s.tel_label} {s.tel_number}
          </p>
        )}
      </header>

      <hr className="my-5 border-gray-300" />
      {s.title && <h1 className="text-center text-2xl font-bold">{s.title}</h1>}
      <hr className="my-5 border-gray-300" />

      <p className="text-center text-base font-bold">
        {s.number_label} {invoiceNumber(order)}
      </p>

      {/* The facts, label left and value right, as the reference has them */}
      <dl className="mt-6 space-y-1 text-[13px]">
        {s.order_type_label && (
          <Fact label={s.order_type_label} value={orderTypeLabel(order)} bold />
        )}
        {s.table_label && order.table_id && (
          <Fact label={s.table_label} value={order.table_id} bold />
        )}
        {s.staff_label && s.staff_name && <Fact label={s.staff_label} value={s.staff_name} bold />}
        {s.customer_label && order.guest_name && (
          <Fact label={s.customer_label} value={order.guest_name} />
        )}
        {s.phone_label && order.phone && <Fact label={s.phone_label} value={order.phone} />}
        <Fact label={date} value={time} bold />
      </dl>

      {/* Items */}
      <table className="mt-6 w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-y border-gray-300">
            <th className="py-2 text-left font-semibold">{s.qty_label}</th>
            <th className="py-2 text-center font-semibold">{s.item_label}</th>
            <th className="py-2 text-right font-semibold">{s.amount_label}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-3 text-center text-gray-500">
                {order.notes || "—"}
              </td>
            </tr>
          ) : (
            order.items.map((line, i) => (
              <tr key={`${line.name}-${i}`} className="align-top">
                <td className="py-1.5 text-left">{line.qty}</td>
                <td className="py-1.5 text-center">
                  {line.name}
                  {line.unit_price > 0 && ` (${line.unit_price.toFixed(2)})`}
                  {line.extras && (
                    <span className="block text-[11.5px] text-gray-600">
                      + {line.extras}
                      {line.extras_price ? ` (${line.extras_price.toFixed(2)})` : ""}
                    </span>
                  )}
                </td>
                <td className="py-1.5 text-right">{line.line_total.toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <hr className="my-4 border-gray-300" />

      {/* Money */}
      <dl className="space-y-1 text-[13px]">
        {s.subtotal_label && <Fact label={s.subtotal_label} value={money(order.subtotal)} />}
        {s.discount_label && order.discount_total > 0 && (
          <Fact label={s.discount_label} value={`−${money(order.discount_total)}`} />
        )}
        {/* The rate belongs inside the label's punctuation — "Tax (5%):", not
            "Tax: (5%)" — so it reads as one heading however admin words it. */}
        {s.tax_label && (
          <Fact label={withRate(s.tax_label, VAT_PERCENT)} value={money(order.tax_amount)} />
        )}
        {s.show_surcharge && s.surcharge_label && (
          <Fact label={s.surcharge_label} value={money(0)} />
        )}
      </dl>

      <hr className="my-3 border-gray-300" />
      <div className="flex items-center justify-between text-base font-bold">
        <span>{s.total_label}</span>
        <span>{money(order.total_amount)}</span>
      </div>

      {s.show_paid && (
        <>
          {/* How it was settled, in the words admin chose. */}
          <div className="mt-2 flex items-center justify-between text-[13px]">
            <span>{order.payment_method === "card" ? s.card_label : s.cash_label}</span>
            <span>{money(order.total_amount)}</span>
          </div>
          <hr className="my-3 border-gray-300" />
          <div className="flex items-center justify-between text-base font-bold">
            <span>{s.paid_label}</span>
            <span>{money(order.total_amount)}</span>
          </div>
        </>
      )}

      {(s.show_tips || s.show_fulfilment) && (
        <>
          <hr className="my-3 border-gray-300" />
          <dl className="space-y-1 text-[13px]">
            {s.show_tips && s.tips_label && <Fact label={s.tips_label} value={money(0)} />}
            {/* Pickup or delivery — the thing staff actually need off the
                bottom of a bill, where the change line used to be. */}
            {s.show_fulfilment && s.fulfilment_label && (
              <Fact label={s.fulfilment_label} value={orderTypeLabel(order)} bold />
            )}
          </dl>
        </>
      )}

      {order.notes && order.items.length > 0 && (
        <p className="mt-4 text-[12px] leading-snug text-gray-700">{order.notes}</p>
      )}

      {s.footer_text && (
        <p className="mt-8 text-center text-[12px] text-gray-600">{s.footer_text}</p>
      )}
    </div>
  );
}

/** "Tax:" + 5 → "Tax (5%):". A label with no colon just gains the rate. */
function withRate(label: string, percent: number): string {
  const trimmed = label.trim();
  return trimmed.endsWith(":")
    ? `${trimmed.slice(0, -1).trim()} (${percent}%):`
    : `${trimmed} (${percent}%)`;
}

function Fact({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <dt className={bold ? "font-semibold" : ""}>{label}</dt>
      <dd className={`text-right ${bold ? "font-bold" : ""}`}>{value}</dd>
    </div>
  );
}
