import type { InvoiceOrder } from "@/lib/invoice";
import type { InvoiceSettings } from "@/lib/invoice-settings";

/**
 * A receipt for an 80mm thermal roll.
 *
 * Not the A4 tax invoice reduced — a different document for different paper.
 * The roll is 80mm wide with about 72mm of print, one column, no rules that
 * depend on colour, and no fixed height: the paper is cut where the content
 * ends. Everything here follows from that.
 *
 * The type is deliberately plain and largish. A thermal head is 203dpi and the
 * receipt is read in a car park, so hairlines and 9px greys that look elegant
 * on a screen come out as smudge. Borders are dashed black, weights are bold or
 * normal, and there is nothing in between.
 */

/** 72mm of printable width inside an 80mm roll, in millimetres. */
export const ROLL_WIDTH_MM = 72;

function money(n: number): string {
  return n.toFixed(2);
}

export default function ThermalReceipt({
  order,
  settings,
  logoUrl,
  orderCode,
  sourceLabel,
  footerNote,
}: {
  order: InvoiceOrder;
  settings: Partial<InvoiceSettings> | null;
  logoUrl?: string;
  /** "ORD-1048" as the till prints it, rather than a bare number. */
  orderCode: string;
  /**
   * Where the order came from — "Kiosk · UNIVERCITY TAB 1", "Counter · THOMAS",
   * "Website". Blank prints nothing, so a receipt from before the panels were
   * named does not grow an empty row.
   */
  sourceLabel?: string;
  footerNote?: string;
}) {
  const s = settings ?? {};
  const placed = new Date(order.created_at);

  const line = { borderTop: "1px dashed #000", margin: "6px 0" } as const;

  return (
    <div
      className="thermal"
      style={{
        width: `${ROLL_WIDTH_MM}mm`,
        margin: "0 auto",
        padding: "4mm 3mm",
        background: "#fff",
        color: "#000",
        // A hair wider than the screen default; thermal output loses fine strokes.
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        fontSize: "11.5px",
        lineHeight: 1.35,
      }}
    >
      {/* ─── Head ─── */}
      <div style={{ textAlign: "center" }}>
        {s.show_logo !== false && (s.logo_url || logoUrl) && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={s.logo_url || logoUrl}
            alt=""
            style={{ maxWidth: "38mm", maxHeight: "16mm", objectFit: "contain", margin: "0 auto 4px" }}
          />
        )}
        <p style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "0.02em" }}>
          {s.business_name || "Two In One"}
        </p>
        {s.branch_line && <p style={{ fontSize: "11px" }}>{s.branch_line}</p>}
        {s.tel_number && (
          <p style={{ fontSize: "11px" }}>
            {s.tel_label || "Tel"}: {s.tel_number}
          </p>
        )}
        {s.trn_number && (
          <p style={{ fontSize: "11px" }}>
            {s.trn_label || "TRN"}: {s.trn_number}
          </p>
        )}
      </div>

      <div style={line} />

      {/* ─── Which order ─── */}
      <p style={{ textAlign: "center", fontSize: "13px", fontWeight: 800 }}>
        {s.title || "TAX INVOICE"}
      </p>
      <p style={{ textAlign: "center", fontSize: "17px", fontWeight: 800, margin: "2px 0" }}>
        {orderCode}
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
        <span>{placed.toLocaleDateString("en-GB")}</span>
        <span>{placed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      {order.order_type && <Fact label={s.order_type_label || "Type"} value={order.order_type} />}
      {s.show_source !== false && sourceLabel && (
        <Fact label={s.source_label || "Order From"} value={sourceLabel} />
      )}
      {order.table_id && <Fact label={s.table_label || "Table"} value={order.table_id} />}
      {order.guest_name && <Fact label={s.customer_label || "Customer"} value={order.guest_name} />}
      {order.phone && <Fact label={s.phone_label || "Phone"} value={order.phone} />}

      <div style={line} />

      {/* ─── What was ordered ─── */}
      {order.items.map((item, i) => (
        <div key={i} style={{ marginBottom: "4px" }}>
          <p style={{ fontWeight: 700 }}>{item.name}</p>
          {item.extras && <p style={{ fontSize: "10.5px", paddingLeft: "3mm" }}>+ {item.extras}</p>}
          {/* Bold and marked, because this is the line the cook acts on and
              the one that costs a remake when it is missed. */}
          {item.note && (
            <p style={{ fontSize: "10.5px", paddingLeft: "3mm", fontWeight: 700 }}>
              ** {item.note}
            </p>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
            <span>
              {item.qty} × {money(item.unit_price)}
            </span>
            <span style={{ fontWeight: 700 }}>{money(item.line_total)}</span>
          </div>
        </div>
      ))}

      {/* What the customer asked for the whole order, boxed off from the
          items above it so a cook does not read it as another dish. */}
      {order.customer_note && (
        <>
          <div style={line} />
          <p style={{ fontSize: "11px", fontWeight: 700 }}>NOTE</p>
          <p style={{ fontSize: "11px" }}>{order.customer_note}</p>
        </>
      )}

      <div style={line} />

      {/* ─── The money ─── */}
      <Row label="Subtotal" value={money(order.subtotal)} />
      {order.discount_total > 0 && <Row label="Discount" value={`-${money(order.discount_total)}`} />}
      <Row label={`VAT (included)`} value={money(order.tax_amount)} />

      <div style={{ ...line, borderTopStyle: "solid" }} />

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 800 }}>
        <span>TOTAL</span>
        <span>AED {money(order.total_amount)}</span>
      </div>

      {order.payment_method && order.payment_method !== "pending" && (
        <p style={{ textAlign: "right", fontSize: "11px", marginTop: "2px", textTransform: "capitalize" }}>
          Paid by {order.payment_method}
        </p>
      )}

      <div style={line} />

      {/* ─── Foot ─── */}
      <div style={{ textAlign: "center", fontSize: "11px" }}>
        {footerNote && <p>{footerNote}</p>}
        {/* The same closing line the A4 invoice carries, set in admin → Invoice,
            so the two documents do not say different things. */}
        {s.footer_text && <p>{s.footer_text}</p>}
        <p style={{ marginTop: "4px", fontWeight: 700 }}>Thank you!</p>
      </div>

      {/* Blank tail so the cutter does not take the last line with it. */}
      <div style={{ height: "10mm" }} />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
      <span>{label}</span>
      <span style={{ fontWeight: 700, textAlign: "right", maxWidth: "45mm" }}>{value}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
